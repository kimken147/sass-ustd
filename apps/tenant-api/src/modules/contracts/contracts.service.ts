import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
  Inject,
} from "@nestjs/common";
import { EntityManager } from "@mikro-orm/postgresql";
import {
  TenantConfig,
  TenantUser,
  UserRole,
  UserStatus,
  Customer,
  CustomerStatus,
  CustomerWallet,
  Agent,
  AgentStatus,
  SystemFeeDistribution,
  SystemFeeDistributionStatus,
  RevenueDistribution,
  RevenueDistributionStatus,
  WalletDistribution,
  CommissionPayout,
  CommissionPayoutStatus,
  CommissionPayoutType,
  AgentCommissionSetting,
} from "@saas-platform/database";
import { PasswordService } from "@saas-platform/auth";
import { ConfigService } from "@nestjs/config";
import { ExecuteContractDto } from "./dto/execute-contract.dto";
import { ContractInfoDto } from "./dto/contract-info.dto";
import { ExecuteContractResponseDto } from "./dto/execute-contract-response.dto";
import { ProcessInvestmentDto } from "./dto/process-investment.dto";
import { TronService } from "./services/tron.service";
import { TENANT_ENTITY_MANAGER } from "../../common/database";

/**
 * 代理链节点（用于分润计算）
 */
interface AgentChainNode {
  agent: Agent;
  allocatedRate: number;  // 被分配的全局比率
  selfRate: number;       // 自己保留的比率
  amount: number;         // 应得金额
}

/**
 * 合约服务
 *
 * 使用独立的 Tenant DB，配置存放在 tenant_config 表（只有一笔记录）
 */
@Injectable()
export class ContractsService {
  private readonly logger = new Logger(ContractsService.name);

  constructor(
    @Inject(TENANT_ENTITY_MANAGER)
    private readonly em: EntityManager,
    private readonly passwordService: PasswordService,
    private readonly tronService: TronService,
    private readonly configService: ConfigService
  ) {}

  /**
   * 获取租户配置（只有一笔）
   */
  private async getTenantConfig(): Promise<TenantConfig> {
    const config = await this.em.findOne(TenantConfig, { id: 1 });
    if (!config) {
      throw new NotFoundException("租户配置不存在，请先初始化");
    }
    return config;
  }

  /**
   * 获取代理被分配的全局比率
   */
  private async getAgentAllocatedRate(agentId: number): Promise<number> {
    const setting = await this.em.findOne(AgentCommissionSetting, {
      childAgent: agentId,
    });

    if (!setting) {
      // 如果没有找到，可能是站长（顶级代理）
      const agent = await this.em.findOne(Agent, { id: agentId });
      if (agent && agent.level === 0) {
        // 站长的比率是自动计算的（100% - systemFeeRate）
        const config = await this.getTenantConfig();
        return 100 - config.systemFeeRate;
      }
      throw new NotFoundException('找不到代理的分配比率设置');
    }

    return Number(setting.allocatedRate);
  }

  /**
   * 获取代理链及其分配比率（从最底层到最顶层）
   * 用于分润计算
   */
  private async getAgentChainWithRates(
    startAgent: Agent,
    investmentAmount: number
  ): Promise<AgentChainNode[]> {
    const chain: AgentChainNode[] = [];
    let currentAgent: Agent | null = startAgent;
    let previousAllocatedRate = 0;

    while (currentAgent) {
      // 预加载代理关系
      await this.em.populate(currentAgent, ['parentAgent', 'wallet']);

      // 排除站长（level=0），站长不参与代理分润链
      if (currentAgent.level === 0) {
        break;
      }

      // 获取当前代理被分配的比率
      const allocatedRate = await this.getAgentAllocatedRate(currentAgent.id);

      // 计算 selfRate（自己保留的比率）
      // selfRate = 自己的 allocatedRate - 下级的 allocatedRate
      const selfRate = allocatedRate - previousAllocatedRate;

      // 计算应得金额
      const amount = investmentAmount * (selfRate / 100);

      chain.push({
        agent: currentAgent,
        allocatedRate,
        selfRate,
        amount,
      });

      previousAllocatedRate = allocatedRate;

      // 移动到上级代理
      if (currentAgent.parentAgent) {
        currentAgent = await this.em.findOne(
          Agent,
          { id: currentAgent.parentAgent.id },
          { populate: ['parentAgent', 'wallet'] }
        );
      } else {
        currentAgent = null;
      }
    }

    return chain;
  }

  /**
   * 获取合约信息
   */
  async getContractInfo(): Promise<ContractInfoDto> {
    const config = await this.getTenantConfig();

    const executionWalletAddress =
      config.cryptoConfig.executionWalletAddress ||
      this.configService.get<string>("CONTRACT_EXECUTION_WALLET_ADDRESS");

    if (!executionWalletAddress) {
      throw new NotFoundException("執行錢包地址未設定，請先在租戶配置中設定 executionWalletAddress");
    }

    return {
      contractAddress: executionWalletAddress, // 用戶 approve 的目標地址
      usdtTokenAddress: config.cryptoConfig.usdtTokenAddress,
      executionWalletAddress,
      minInvestment: config.cryptoConfig.minInvestment,
      maxInvestment: config.cryptoConfig.maxInvestment,
      supportedChains: config.cryptoConfig.supportedChains,
      supportedTokens: config.cryptoConfig.supportedTokens,
    };
  }

  /**
   * 执行合约
   */
  async executeContract(
    dto: ExecuteContractDto
  ): Promise<ExecuteContractResponseDto> {
    // 验证代理推荐码（如果提供）
    let referralAgent: Agent | null = null;
    if (dto.referralCode) {
      referralAgent = await this.em.findOne(
        Agent,
        {
          code: dto.referralCode,
          status: AgentStatus.ACTIVE,
        },
        {
          populate: ["user"],
        }
      );

      if (!referralAgent) {
        throw new NotFoundException("代理推荐码不存在或已停用");
      }
    }

    // 查找是否已存在该钱包地址的会员
    const allCustomers = await this.em.find(Customer, {}, {
      populate: ["user", "referralAgent"],
    });

    let customer = allCustomers.find(
      (c) => c.wallet?.address === dto.walletAddress
    );

    let isNewCustomer = false;
    let user: TenantUser;

    if (customer) {
      user = customer.user;

      if (referralAgent && !customer.referralAgent) {
        customer.referralAgent = referralAgent;
        referralAgent.stats.totalCustomers += 1;
        referralAgent.stats.activeCustomers += 1;
      }

      if (!customer.wallet) {
        customer.wallet = {
          address: dto.walletAddress,
          chain: "tron",
          isApproved: true,
          approvedAmount: dto.approvedAmount.toString(),
          approvedAt: new Date(),
          approvalTxHash: dto.approvalTxHash,
        };
      } else if (customer.wallet.address !== dto.walletAddress) {
        customer.wallet.address = dto.walletAddress;
        customer.wallet.isApproved = true;
        customer.wallet.approvedAmount = dto.approvedAmount.toString();
        customer.wallet.approvedAt = new Date();
        customer.wallet.approvalTxHash = dto.approvalTxHash;
      } else {
        customer.wallet.isApproved = true;
        customer.wallet.approvedAmount = dto.approvedAmount.toString();
        customer.wallet.approvedAt = new Date();
        customer.wallet.approvalTxHash = dto.approvalTxHash;
      }
    } else {
      isNewCustomer = true;

      let username: string;
      let email: string;
      let name: string;

      if (dto.username && dto.email) {
        const existingUser = await this.em.findOne(TenantUser, {
          username: dto.username,
        });
        if (existingUser) {
          throw new ConflictException("该账号已存在");
        }

        const existingEmail = await this.em.findOne(TenantUser, {
          email: dto.email,
        });
        if (existingEmail) {
          throw new ConflictException("该 Email 已存在");
        }

        username = dto.username;
        email = dto.email;
        name = dto.name || dto.username;
      } else {
        const walletSuffix = dto.walletAddress.slice(-8);
        username = `wallet_${walletSuffix}`;
        email = `${username}@wallet.local`;
        name = dto.name || `Wallet ${walletSuffix}`;
      }

      const randomPassword = this.generateRandomPassword();
      const hashedPassword =
        await this.passwordService.hashPassword(randomPassword);

      user = this.em.create(TenantUser, {
        username,
        email,
        password: hashedPassword,
        name,
        role: UserRole.CUSTOMER,
        status: UserStatus.ACTIVE,
      });

      const wallet: CustomerWallet = {
        address: dto.walletAddress,
        chain: "tron",
        isApproved: true,
        approvedAmount: dto.approvedAmount.toString(),
        approvedAt: new Date(),
        approvalTxHash: dto.approvalTxHash,
      };

      customer = this.em.create(Customer, {
        user,
        referralAgent: referralAgent || undefined,
        status: CustomerStatus.ACTIVE,
        wallet,
      });

      if (referralAgent) {
        referralAgent.stats.totalCustomers += 1;
        referralAgent.stats.activeCustomers += 1;
      }
    }

    await this.em.flush();

    return {
      customerId: customer.id,
      userId: user.id,
      name: user.name,
      walletAddress: dto.walletAddress,
      referralAgentId: customer.referralAgent?.id,
      referralAgentCode: customer.referralAgent?.code,
      status: customer.status,
      isNewCustomer,
    };
  }

  /**
   * 处理投资并进行分润（全局比率模型）
   */
  async processInvestment(
    dto: ProcessInvestmentDto
  ): Promise<{
    customerId: number;
    investmentAmount: number;
    systemFee: number;
    tenantRevenue: number;
    agentCommission: number;
    distributions: {
      systemFee: SystemFeeDistribution[];
      revenue: RevenueDistribution;
      commissions: CommissionPayout[];
    };
  }> {
    const config = await this.getTenantConfig();

    // 验证投资金额（仅检查大于 0）
    if (dto.amount <= 0) {
      throw new BadRequestException('投资金额必须大于 0');
    }

    // 查找会员
    const customer = await this.em.findOne(
      Customer,
      { id: dto.customerId },
      { populate: ["user", "referralAgent"] }
    );

    if (!customer) {
      throw new NotFoundException("会员不存在");
    }

    if (!customer.wallet) {
      throw new BadRequestException("会员尚未授权合约，请先执行授权合约操作");
    }

    if (!customer.wallet.isApproved) {
      throw new BadRequestException("会员合约授权状态无效，请重新授权");
    }

    const customerWalletAddress = customer.wallet.address;
    const investmentAmount = dto.amount;
    const systemFeeRate = config.systemFeeRate || 10.0;

    // 1. 计算系统费
    const systemFee = investmentAmount * (systemFeeRate / 100);

    // 2. 判断会员是否有有效的推荐代理
    const hasValidReferralAgent =
      customer.referralAgent &&
      customer.referralAgent.commission?.isEnabled &&
      customer.referralAgent.status === AgentStatus.ACTIVE;

    let tenantRevenue = 0;
    let totalAgentCommission = 0;
    let agentChain: AgentChainNode[] = [];

    if (hasValidReferralAgent) {
      // 3. 获取代理链及其分配比率
      agentChain = await this.getAgentChainWithRates(
        customer.referralAgent,
        investmentAmount
      );

      // 4. 计算站长收入（剩余全拿）
      // 找到顶层代理（最后一个节点）的 allocatedRate
      const topAgentRate = agentChain.length > 0
        ? agentChain[agentChain.length - 1].allocatedRate
        : 0;

      tenantRevenue = investmentAmount * ((100 - systemFeeRate - topAgentRate) / 100);
      totalAgentCommission = investmentAmount - systemFee - tenantRevenue;
    } else {
      // 无推荐代理，站长获得全部剩余池
      tenantRevenue = investmentAmount - systemFee;
      totalAgentCommission = 0;
    }

    this.logger.log(
      `会员 ${customer.id} 分润计算 - ` +
      `系统费: ${systemFee.toFixed(2)} (${systemFeeRate}%), ` +
      `站长收入: ${tenantRevenue.toFixed(2)}, ` +
      `代理佣金: ${totalAgentCommission.toFixed(2)}`
    );

    // 5. 分配系统费
    const systemFeeDistributions: SystemFeeDistribution[] = [];
    if (config.systemWallets && config.systemWallets.length > 0) {
      for (const systemWallet of config.systemWallets) {
        const amount = systemFee * (systemWallet.percentage / 100);
        const distribution = this.em.create(SystemFeeDistribution, {
          customer,
          amount: amount.toFixed(6),
          originalAmount: investmentAmount.toFixed(6),
          feeRate: systemFeeRate,
          systemWalletAddress: systemWallet.address,
          chain: "tron",
          status: SystemFeeDistributionStatus.PENDING,
        });

        try {
          const txHash = await this.tronService.transferUSDT(
            customerWalletAddress,
            systemWallet.address,
            amount,
            config.cryptoConfig.usdtTokenAddress,
            config.cryptoConfig.executionWalletPrivateKey
          );
          distribution.txHash = txHash;
          distribution.status = SystemFeeDistributionStatus.COMPLETED;
          distribution.completedAt = new Date();
          distribution.processedAt = new Date();
        } catch (error) {
          distribution.status = SystemFeeDistributionStatus.FAILED;
          distribution.txError =
            error instanceof Error ? error.message : String(error);
        }

        systemFeeDistributions.push(distribution);
      }
    }

    // 6. 分配站长收入
    const activeRevenueWallets = config.revenueWallets.filter(
      (w) => w.isActive
    );
    if (activeRevenueWallets.length === 0) {
      throw new BadRequestException("未设定有效的租户分润钱包");
    }

    let revenueDistribution: RevenueDistribution | null = null;

    if (tenantRevenue > 0) {
      const tenantRevenueRate = (tenantRevenue / investmentAmount) * 100;
      const walletDistributions: WalletDistribution[] = activeRevenueWallets.map(
        (wallet) => {
          const amount = tenantRevenue * (wallet.percentage / 100);
          const isFirstPayout = !wallet.verified;
          return {
            walletId: wallet.id,
            walletName: wallet.name || "未命名钱包",
            walletAddress: wallet.address,
            percentage: wallet.percentage,
            amount: amount.toFixed(6),
            status: "pending" as const,
            isFirstPayout,
          };
        }
      );

      revenueDistribution = this.em.create(RevenueDistribution, {
        customer,
        totalAmount: tenantRevenue.toFixed(6),
        originalAmount: investmentAmount.toFixed(6),
        revenueRate: tenantRevenueRate,
        walletDistributions,
        status: RevenueDistributionStatus.PENDING,
      });

      for (const walletDist of walletDistributions) {
        try {
          const txHash = await this.tronService.transferUSDT(
            customerWalletAddress,
            walletDist.walletAddress,
            parseFloat(walletDist.amount),
            config.cryptoConfig.usdtTokenAddress,
            config.cryptoConfig.executionWalletPrivateKey
          );
          walletDist.txHash = txHash;
          walletDist.status = "completed";
          walletDist.completedAt = new Date();

          if (walletDist.isFirstPayout) {
            const configWallet = config.revenueWallets.find(
              (w) => w.id === walletDist.walletId
            );
            if (configWallet) {
              configWallet.verified = true;
              configWallet.verifiedAt = new Date();
              configWallet.verificationTxHash = txHash;
            }
          }
        } catch (error) {
          walletDist.status = "failed";
          walletDist.error =
            error instanceof Error ? error.message : String(error);
        }
      }

      const allWalletsFailed = walletDistributions.every((d) => d.status === "failed");
      const anyWalletCompleted = walletDistributions.some((d) => d.status === "completed");

      if (allWalletsFailed) {
        revenueDistribution.status = RevenueDistributionStatus.FAILED;
      } else if (anyWalletCompleted) {
        revenueDistribution.status = RevenueDistributionStatus.COMPLETED;
        revenueDistribution.completedAt = new Date();
        revenueDistribution.processedAt = new Date();
      }

      this.logger.log(
        `站长收入: ${tenantRevenue.toFixed(2)} USDT (${tenantRevenueRate.toFixed(1)}%)`
      );
    }

    // 7. 分配代理佣金（使用全局比率直接计算）
    const commissionPayouts: CommissionPayout[] = [];

    for (const node of agentChain) {
      if (node.amount <= 0) continue;

      // 检查代理状态
      if (node.agent.status !== AgentStatus.ACTIVE) {
        this.logger.warn(`代理 ${node.agent.id} 状态为 ${node.agent.status}，跳过分润`);
        continue;
      }

      if (!node.agent.commission?.isEnabled) {
        this.logger.warn(`代理 ${node.agent.id} 佣金功能已停用，跳过分润`);
        continue;
      }

      if (!node.agent.wallet?.address) {
        this.logger.warn(`代理 ${node.agent.id} 钱包地址未设定，跳过分润`);
        continue;
      }

      const isFirstPayout = !node.agent.wallet.verified;

      const payout = this.em.create(CommissionPayout, {
        agent: node.agent,
        customer,
        type: CommissionPayoutType.SELF,
        amount: node.amount.toFixed(6),
        originalInvestmentAmount: investmentAmount.toFixed(6),
        commissionRate: node.selfRate,
        selfRate: node.selfRate,
        passedToUplineAmount: "0",
        walletAddress: node.agent.wallet.address,
        chain: "tron",
        status: CommissionPayoutStatus.PENDING,
        isFirstPayout,
      });

      try {
        const txHash = await this.tronService.transferUSDT(
          customerWalletAddress,
          node.agent.wallet.address,
          node.amount,
          config.cryptoConfig.usdtTokenAddress,
          config.cryptoConfig.executionWalletPrivateKey
        );
        payout.txHash = txHash;
        payout.status = CommissionPayoutStatus.COMPLETED;
        payout.completedAt = new Date();
        payout.processedAt = new Date();

        // 第一次分润自动验证
        if (isFirstPayout && node.agent.wallet) {
          node.agent.wallet.verified = true;
          node.agent.wallet.verifiedAt = new Date();
          node.agent.wallet.verificationTxHash = txHash;
        }

        // 更新统计
        node.agent.stats.totalCommissionEarned += node.amount;
        node.agent.wallet.totalPaidAmount += node.amount;
        node.agent.wallet.lastPaidAt = new Date();

        this.logger.log(
          `代理 ${node.agent.name} (${node.agent.code}) 收到 ${node.amount.toFixed(2)} USDT (${node.selfRate.toFixed(1)}%)`
        );
      } catch (error) {
        payout.status = CommissionPayoutStatus.FAILED;
        payout.txError = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `代理 ${node.agent.id} 分润失败: ${payout.txError}`
        );
      }

      commissionPayouts.push(payout);
    }

    // 檢查是否所有轉帳都失敗
    const allSystemFeeFailed = systemFeeDistributions.length > 0 &&
      systemFeeDistributions.every((d) => d.status === SystemFeeDistributionStatus.FAILED);
    const allRevenueFailed = revenueDistribution &&
      revenueDistribution.walletDistributions?.every((d) => d.status === "failed");

    if (allSystemFeeFailed && (!revenueDistribution || allRevenueFailed)) {
      const firstError = systemFeeDistributions[0]?.txError ||
        revenueDistribution?.walletDistributions?.[0]?.error ||
        "所有鏈上轉帳均失敗";
      throw new BadRequestException(`提幣失敗: ${firstError}`);
    }

    // 更新会员投资统计
    customer.investmentStats.totalInvested += investmentAmount;
    customer.investmentStats.investmentCount += 1;
    if (!customer.investmentStats.firstInvestmentAt) {
      customer.investmentStats.firstInvestmentAt = new Date();
    }
    customer.investmentStats.lastInvestmentAt = new Date();

    await this.em.flush();

    return {
      customerId: customer.id,
      investmentAmount,
      systemFee,
      tenantRevenue,
      agentCommission: totalAgentCommission,
      distributions: {
        systemFee: systemFeeDistributions,
        revenue: revenueDistribution,
        commissions: commissionPayouts,
      },
    };
  }

  /**
   * 获取钱包的 USDT 余额
   */
  async getUSDTBalance(walletAddress: string): Promise<number> {
    return this.tronService.getUSDTBalance(walletAddress);
  }

  /**
   * 生成随机密码
   */
  private generateRandomPassword(): string {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let password = "";
    for (let i = 0; i < 32; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }
}
