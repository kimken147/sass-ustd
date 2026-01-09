import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@mikro-orm/nestjs";
import { EntityRepository, EntityManager } from "@mikro-orm/postgresql";
import {
  Tenant,
  User,
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
} from "@saas-platform/database";
import { PasswordService } from "@saas-platform/auth";
import { ConfigService } from "@nestjs/config";
import { ExecuteContractDto } from "./dto/execute-contract.dto";
import { ContractInfoDto } from "./dto/contract-info.dto";
import { ExecuteContractResponseDto } from "./dto/execute-contract-response.dto";
import { ProcessInvestmentDto } from "./dto/process-investment.dto";
import { TronService } from "./services/tron.service";

@Injectable()
export class ContractsService {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepository: EntityRepository<Tenant>,
    @InjectRepository(User)
    private readonly userRepository: EntityRepository<User>,
    @InjectRepository(Customer)
    private readonly customerRepository: EntityRepository<Customer>,
    @InjectRepository(Agent)
    private readonly agentRepository: EntityRepository<Agent>,
    @InjectRepository(SystemFeeDistribution)
    private readonly systemFeeDistributionRepository: EntityRepository<SystemFeeDistribution>,
    @InjectRepository(RevenueDistribution)
    private readonly revenueDistributionRepository: EntityRepository<RevenueDistribution>,
    @InjectRepository(CommissionPayout)
    private readonly commissionPayoutRepository: EntityRepository<CommissionPayout>,
    private readonly em: EntityManager,
    private readonly passwordService: PasswordService,
    private readonly tronService: TronService,
    private readonly configService: ConfigService
  ) {}

  /**
   * 獲取合約資訊
   * 包含合約地址、執行錢包地址等
   */
  async getContractInfo(tenantId: number): Promise<ContractInfoDto> {
    const tenant = await this.tenantRepository.findOne(
      { id: tenantId },
      {
        populate: [],
      }
    );

    if (!tenant) {
      throw new NotFoundException("租戶不存在");
    }

    // 獲取執行合約的錢包地址（從 tenant 配置或環境變數）
    const executionWalletAddress =
      tenant.cryptoConfig.executionWalletAddress ||
      this.configService.get<string>("CONTRACT_EXECUTION_WALLET_ADDRESS") ||
      tenant.cryptoConfig.investmentContractAddress; // 臨時使用合約地址

    return {
      contractAddress: tenant.cryptoConfig.investmentContractAddress,
      usdtTokenAddress: tenant.cryptoConfig.usdtTokenAddress,
      executionWalletAddress,
      minInvestment: tenant.cryptoConfig.minInvestment,
      maxInvestment: tenant.cryptoConfig.maxInvestment,
      supportedChains: tenant.cryptoConfig.supportedChains,
      supportedTokens: tenant.cryptoConfig.supportedTokens,
    };
  }

  /**
   * 執行合約
   * 1. 驗證代理推薦碼（如果提供）
   * 2. 查找或創建會員
   * 3. 關聯代理（如果提供推薦碼）
   * 4. 記錄錢包資訊
   */
  async executeContract(
    tenantId: number,
    dto: ExecuteContractDto
  ): Promise<ExecuteContractResponseDto> {
    const tenant = await this.tenantRepository.findOne({ id: tenantId });
    if (!tenant) {
      throw new NotFoundException("租戶不存在");
    }

    // 驗證代理推薦碼（如果提供）
    let referralAgent: Agent | null = null;
    if (dto.referralCode) {
      referralAgent = await this.agentRepository.findOne(
        {
          code: dto.referralCode,
          tenant: tenantId,
          status: AgentStatus.ACTIVE,
        },
        {
          populate: ["user"],
        }
      );

      if (!referralAgent) {
        throw new NotFoundException("代理推薦碼不存在或已停用");
      }
    }

    // 查找是否已存在該錢包地址的會員
    // 由於 wallet 是 JSON 欄位，需要查詢所有該租戶的會員，然後在記憶體中過濾
    const allCustomers = await this.customerRepository.find(
      { tenant: tenantId },
      {
        populate: ["user", "referralAgent"],
      }
    );

    let customer = allCustomers.find(
      (c) => c.wallet?.address === dto.walletAddress
    );

    let isNewCustomer = false;
    let user: User;

    if (customer) {
      // 會員已存在，使用現有的
      user = customer.user;

      // 如果提供了推薦碼且會員還沒有推薦代理，則關聯代理
      if (referralAgent && !customer.referralAgent) {
        customer.referralAgent = referralAgent;
        // 更新代理統計
        referralAgent.stats.totalCustomers += 1;
        referralAgent.stats.activeCustomers += 1;
      }

      // 更新錢包資訊（如果地址相同但資訊有更新）
      if (!customer.wallet) {
        customer.wallet = {
          address: dto.walletAddress,
          chain: "tron",
          isApproved: false,
          approvedAmount: "0",
        };
      } else if (customer.wallet.address !== dto.walletAddress) {
        // 如果地址改變，更新地址並重置授權狀態
        customer.wallet.address = dto.walletAddress;
        customer.wallet.isApproved = false;
        customer.wallet.approvedAmount = "0";
        customer.wallet.approvedAt = undefined;
        customer.wallet.approvalTxHash = undefined;
      }
    } else {
      // 創建新會員
      isNewCustomer = true;

      // 創建 User（會員不需要登入，所以密碼自動生成隨機密碼）
      let username: string;
      let email: string;
      let name: string;

      if (dto.username && dto.email) {
        // 如果提供了 username 和 email，使用提供的值
        // 檢查是否已存在
        const existingUser = await this.userRepository.findOne({
          username: dto.username,
          tenant: tenantId,
        });
        if (existingUser) {
          throw new ConflictException("該帳號已存在");
        }

        const existingEmail = await this.userRepository.findOne({
          email: dto.email,
          tenant: tenantId,
        });
        if (existingEmail) {
          throw new ConflictException("該 Email 已存在");
        }

        username = dto.username;
        email = dto.email;
        name = dto.name || dto.username;
      } else {
        // 如果沒有提供用戶資訊，使用錢包地址生成
        const walletSuffix = dto.walletAddress.slice(-8);
        username = `wallet_${walletSuffix}`;
        email = `${username}@wallet.local`;
        name = dto.name || `Wallet ${walletSuffix}`;
      }

      // 生成隨機密碼（會員不需要登入，所以使用隨機密碼）
      const randomPassword = this.generateRandomPassword();
      const hashedPassword =
        await this.passwordService.hashPassword(randomPassword);

      user = this.userRepository.create({
        username,
        email,
        password: hashedPassword,
        name,
        role: UserRole.CUSTOMER,
        status: UserStatus.ACTIVE,
        tenant: tenantId,
      });

      // 創建 Customer
      const wallet: CustomerWallet = {
        address: dto.walletAddress,
        chain: "tron",
        isApproved: false,
        approvedAmount: "0",
      };

      customer = this.customerRepository.create({
        tenant: tenantId,
        user,
        referralAgent: referralAgent || undefined,
        status: CustomerStatus.ACTIVE,
        wallet,
      });

      // 更新代理統計（如果有推薦代理）
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
   * 處理投資並進行分潤
   * 1. 驗證投資金額
   * 2. 查找或創建會員
   * 3. 計算分潤（系統費、租戶收入、代理佣金）
   * 4. 執行轉帳並創建記錄
   */
  async processInvestment(
    tenantId: number,
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
    const tenant = await this.tenantRepository.findOne(
      { id: tenantId },
      {
        populate: [],
      }
    );
    if (!tenant) {
      throw new NotFoundException("租戶不存在");
    }

    // 驗證投資金額
    if (
      dto.amount < tenant.cryptoConfig.minInvestment ||
      dto.amount > tenant.cryptoConfig.maxInvestment
    ) {
      throw new BadRequestException(
        `投資金額必須在 ${tenant.cryptoConfig.minInvestment} 到 ${tenant.cryptoConfig.maxInvestment} USDT 之間`
      );
    }

    // 查找或創建會員
    const allCustomers = await this.customerRepository.find(
      { tenant: tenantId },
      {
        populate: ["user", "referralAgent"],
      }
    );

    let customer = allCustomers.find(
      (c) => c.wallet?.address === dto.walletAddress
    );

    if (!customer) {
      // 如果會員不存在，先創建會員（使用 executeContract 邏輯）
      const executeDto: ExecuteContractDto = {
        walletAddress: dto.walletAddress,
      };
      await this.executeContract(tenantId, executeDto);
      // 重新查找
      const updatedCustomers = await this.customerRepository.find(
        { tenant: tenantId },
        {
          populate: ["user", "referralAgent"],
        }
      );
      customer = updatedCustomers.find(
        (c) => c.wallet?.address === dto.walletAddress
      );
      if (!customer) {
        throw new BadRequestException("無法創建或找到會員");
      }
    }

    // 計算分潤金額
    const investmentAmount = dto.amount;
    const systemFeeRate = tenant.systemFeeRate || 10.0;
    const tenantRevenueRate = tenant.cryptoConfig.tenantRevenueRate || 60.0;
    const agentCommissionRate = tenant.cryptoConfig.agentCommissionRate || 30.0;

    // 驗證總和是否為 100%
    const totalRate = systemFeeRate + tenantRevenueRate + agentCommissionRate;
    if (Math.abs(totalRate - 100) > 0.01) {
      throw new BadRequestException(
        `分潤比率總和必須等於 100%，目前為 ${totalRate}%`
      );
    }

    const systemFee = investmentAmount * (systemFeeRate / 100);
    const tenantRevenue = investmentAmount * (tenantRevenueRate / 100);
    const totalCommission = investmentAmount * (agentCommissionRate / 100);

    // 1️⃣ 分配系統費（按 systemWallets 比例）
    const systemFeeDistributions: SystemFeeDistribution[] = [];
    if (tenant.systemWallets && tenant.systemWallets.length > 0) {
      for (const systemWallet of tenant.systemWallets) {
        const amount = systemFee * (systemWallet.percentage / 100);
        const distribution = this.systemFeeDistributionRepository.create({
          tenant: tenantId,
          customer,
          amount: amount.toFixed(6),
          originalAmount: investmentAmount.toFixed(6),
          feeRate: systemFeeRate,
          systemWalletAddress: systemWallet.address,
          chain: "tron",
          status: SystemFeeDistributionStatus.PENDING,
        });

        // 執行轉帳（使用 transferFrom，從會員錢包轉到系統錢包）
        try {
          // 獲取執行合約的錢包地址（從 tenant 配置或環境變數）
          const executionWalletAddress =
            tenant.cryptoConfig.executionWalletAddress ||
            this.configService.get<string>(
              "CONTRACT_EXECUTION_WALLET_ADDRESS"
            ) ||
            tenant.cryptoConfig.investmentContractAddress;

          if (!executionWalletAddress) {
            throw new BadRequestException("未設定執行合約的錢包地址");
          }

          // 從會員錢包轉到系統錢包
          const txHash = await this.tronService.transferUSDT(
            customer.wallet?.address || executionWalletAddress, // 從會員錢包
            systemWallet.address, // 到系統錢包
            amount,
            tenant.cryptoConfig.usdtTokenAddress, // USDT Token 地址
            tenant.cryptoConfig.executionWalletPrivateKey // 執行合約的錢包私鑰
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
    } else {
      // 如果沒有設定系統錢包，記錄錯誤但不中斷流程
      console.warn("未設定系統錢包，無法分配系統費");
    }

    // 2️⃣ 分配租戶收入（按 revenueWallets 比例）
    const activeRevenueWallets = tenant.revenueWallets.filter(
      (w) => w.isActive
    );
    if (activeRevenueWallets.length === 0) {
      throw new BadRequestException("未設定有效的租戶分潤錢包");
    }

    const walletDistributions: WalletDistribution[] = activeRevenueWallets.map(
      (wallet) => {
        const amount = tenantRevenue * (wallet.percentage / 100);
        const isFirstPayout = !wallet.verified;
        return {
          walletId: wallet.id,
          walletName: wallet.name || "未命名錢包",
          walletAddress: wallet.address,
          percentage: wallet.percentage,
          amount: amount.toFixed(6),
          status: "pending" as const,
          isFirstPayout,
        };
      }
    );

    const revenueDistribution = this.revenueDistributionRepository.create({
      tenant: tenantId,
      customer,
      totalAmount: tenantRevenue.toFixed(6),
      originalAmount: investmentAmount.toFixed(6),
      revenueRate: tenantRevenueRate,
      walletDistributions,
      status: RevenueDistributionStatus.PENDING,
    });

    // 執行轉帳到各個租戶錢包
    for (const walletDist of walletDistributions) {
      try {
        // 獲取執行合約的錢包地址（已授權的錢包）
        const executionWalletAddress =
          this.configService.get<string>("CONTRACT_EXECUTION_WALLET_ADDRESS") ||
          tenant.cryptoConfig.investmentContractAddress;

        if (!executionWalletAddress) {
          throw new BadRequestException("未設定執行合約的錢包地址");
        }

        // 從會員錢包轉到租戶錢包
        const txHash = await this.tronService.transferUSDT(
          customer.wallet?.address || executionWalletAddress, // 從會員錢包
          walletDist.walletAddress, // 到租戶錢包
          parseFloat(walletDist.amount),
          tenant.cryptoConfig.usdtTokenAddress // USDT Token 地址
        );
        walletDist.txHash = txHash;
        walletDist.status = "completed";
        walletDist.completedAt = new Date();

        // 第一次分潤自動驗證
        if (walletDist.isFirstPayout) {
          const tenantWallet = tenant.revenueWallets.find(
            (w) => w.id === walletDist.walletId
          );
          if (tenantWallet) {
            tenantWallet.verified = true;
            tenantWallet.verifiedAt = new Date();
            tenantWallet.verificationTxHash = txHash;
          }
        }
      } catch (error) {
        walletDist.status = "failed";
        walletDist.error =
          error instanceof Error ? error.message : String(error);
      }
    }

    revenueDistribution.status = RevenueDistributionStatus.COMPLETED;
    revenueDistribution.completedAt = new Date();
    revenueDistribution.processedAt = new Date();

    // 3️⃣ 分配代理佣金（向上分潤）
    const commissionPayouts: CommissionPayout[] = [];
    if (customer.referralAgent) {
      // 從直接推薦代理開始分配（傳遞 tenant 避免重複查詢）
      await this.distributeAgentCommission(
        tenantId,
        customer,
        customer.referralAgent,
        totalCommission,
        investmentAmount,
        agentCommissionRate,
        commissionPayouts,
        true, // isDirectReferrer
        undefined, // sourceAgent
        new Set(), // visitedAgentIds (初始為空)
        0, // depth (初始為 0)
        tenant // 傳遞已查詢的 tenant
      );
    } else {
      // 如果沒有推薦代理，將佣金給站長（頂級代理）
      const topAgent = await this.agentRepository.findOne(
        {
          tenant: tenantId,
          level: 0,
          parentAgent: null,
        },
        {
          populate: ["wallet"],
        }
      );

      if (topAgent && topAgent.wallet) {
        // 將佣金給站長（頂級代理）
        const payout = this.commissionPayoutRepository.create({
          tenant: tenantId,
          agent: topAgent,
          customer,
          type: CommissionPayoutType.SELF,
          amount: totalCommission.toFixed(6),
          originalInvestmentAmount: investmentAmount.toFixed(6),
          commissionRate: agentCommissionRate,
          walletAddress: topAgent.wallet.address,
          chain: "tron",
          status: CommissionPayoutStatus.PENDING,
          isFirstPayout: !topAgent.wallet.verified,
        });

        try {
          // 獲取執行合約的錢包地址（從 tenant 配置或環境變數）
          const executionWalletAddress =
            tenant.cryptoConfig.executionWalletAddress ||
            this.configService.get<string>(
              "CONTRACT_EXECUTION_WALLET_ADDRESS"
            ) ||
            tenant.cryptoConfig.investmentContractAddress;

          if (!executionWalletAddress) {
            throw new BadRequestException("未設定執行合約的錢包地址");
          }

          // 從會員錢包轉到代理錢包
          const txHash = await this.tronService.transferUSDT(
            customer.wallet?.address || executionWalletAddress, // 從會員錢包
            topAgent.wallet.address, // 到代理錢包
            totalCommission,
            tenant.cryptoConfig.usdtTokenAddress, // USDT Token 地址
            tenant.cryptoConfig.executionWalletPrivateKey // 執行合約的錢包私鑰
          );
          payout.txHash = txHash;
          payout.status = CommissionPayoutStatus.COMPLETED;
          payout.completedAt = new Date();
          payout.processedAt = new Date();

          // 第一次分潤自動驗證
          if (payout.isFirstPayout && topAgent.wallet) {
            topAgent.wallet.verified = true;
            topAgent.wallet.verifiedAt = new Date();
            topAgent.wallet.verificationTxHash = txHash;
          }

          // 更新統計
          topAgent.stats.totalCommissionEarned += totalCommission;
          topAgent.stats.selfCommissionEarned += totalCommission;
          if (topAgent.wallet) {
            topAgent.wallet.totalPaidAmount += totalCommission;
            topAgent.wallet.lastPaidAt = new Date();
          }
        } catch (error) {
          payout.status = CommissionPayoutStatus.FAILED;
          payout.txError =
            error instanceof Error ? error.message : String(error);
        }

        commissionPayouts.push(payout);
      }
    }

    // 更新會員投資統計
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
      agentCommission: totalCommission,
      distributions: {
        systemFee: systemFeeDistributions,
        revenue: revenueDistribution,
        commissions: commissionPayouts,
      },
    };
  }

  /**
   * 分配代理佣金（向上分潤）
   * @param isDirectReferrer 是否為直接推薦代理（第一個調用的代理）
   * @param visitedAgentIds 已訪問的代理 ID 集合（用於循環檢測）
   * @param depth 當前遞歸深度（用於防止過深遞歸）
   * @param tenant 租戶資訊（避免重複查詢）
   */
  private async distributeAgentCommission(
    tenantId: number,
    customer: Customer,
    agent: Agent,
    receivedCommission: number,
    investmentAmount: number,
    commissionRate: number,
    payouts: CommissionPayout[],
    isDirectReferrer: boolean = true,
    sourceAgent?: Agent,
    visitedAgentIds: Set<number> = new Set(),
    depth: number = 0,
    tenant?: Tenant
  ): Promise<void> {
    // 安全限制：最大遞歸深度（防止過深代理鏈）
    const MAX_DEPTH = 100;
    if (depth >= MAX_DEPTH) {
      console.warn(
        `代理佣金分配達到最大深度限制 (${MAX_DEPTH})，停止向上分潤。代理 ID: ${agent.id}`
      );
      return;
    }

    // 循環檢測：防止代理鏈中的循環引用
    if (visitedAgentIds.has(agent.id)) {
      console.error(
        `檢測到代理鏈循環！代理 ID: ${agent.id} 已在訪問路徑中。已訪問的代理: ${Array.from(visitedAgentIds).join(", ")}`
      );
      throw new BadRequestException(
        `代理鏈中存在循環引用，無法繼續分配佣金。代理 ID: ${agent.id}`
      );
    }

    // 將當前代理加入已訪問集合
    visitedAgentIds.add(agent.id);

    // 獲取完整的代理資訊
    const fullAgent = await this.agentRepository.findOne(
      { id: agent.id },
      {
        populate: ["wallet", "parentAgent"],
      }
    );

    if (!fullAgent || !fullAgent.wallet) {
      throw new BadRequestException("代理錢包未設定");
    }

    // 檢查代理狀態：只給啟用的代理分潤
    if (fullAgent.status !== AgentStatus.ACTIVE) {
      console.warn(
        `代理 ID: ${fullAgent.id} 狀態為 ${fullAgent.status}，跳過分潤`
      );
      // 如果代理未啟用，但還有上級代理，繼續向上分潤
      if (fullAgent.parentAgent && receivedCommission > 0.000001) {
        await this.distributeAgentCommission(
          tenantId,
          customer,
          fullAgent.parentAgent,
          receivedCommission, // 將全部佣金傳給上級
          investmentAmount,
          commissionRate,
          payouts,
          false,
          fullAgent,
          visitedAgentIds,
          depth + 1,
          tenant
        );
      }
      return;
    }

    // 檢查佣金是否啟用
    if (!fullAgent.commission.isEnabled) {
      console.warn(`代理 ID: ${fullAgent.id} 的佣金功能已停用，跳過分潤`);
      // 如果佣金未啟用，但還有上級代理，繼續向上分潤
      if (fullAgent.parentAgent && receivedCommission > 0.000001) {
        await this.distributeAgentCommission(
          tenantId,
          customer,
          fullAgent.parentAgent,
          receivedCommission, // 將全部佣金傳給上級
          investmentAmount,
          commissionRate,
          payouts,
          false,
          fullAgent,
          visitedAgentIds,
          depth + 1,
          tenant
        );
      }
      return;
    }

    // 計算當前代理的佣金
    const selfAmount =
      receivedCommission * (fullAgent.commission.selfRate / 100);
    const uplineAmount =
      receivedCommission * (fullAgent.commission.uplineRate / 100);

    // 創建佣金記錄
    const payoutType = isDirectReferrer
      ? CommissionPayoutType.SELF
      : CommissionPayoutType.FROM_DOWNLINE;

    const payout = this.commissionPayoutRepository.create({
      tenant: tenantId,
      agent: fullAgent,
      customer,
      sourceAgent: sourceAgent || undefined,
      type: payoutType,
      amount: selfAmount.toFixed(6),
      originalInvestmentAmount: investmentAmount.toFixed(6),
      commissionRate,
      receivedAmount: isDirectReferrer
        ? undefined
        : receivedCommission.toFixed(6),
      selfRate: fullAgent.commission.selfRate,
      passedToUplineAmount:
        uplineAmount > 0.000001 ? uplineAmount.toFixed(6) : "0",
      walletAddress: fullAgent.wallet.address,
      chain: "tron",
      status: CommissionPayoutStatus.PENDING,
      isFirstPayout: isDirectReferrer && !fullAgent.wallet.verified,
    });

    // 執行轉帳
    try {
      // 獲取租戶配置和執行合約的錢包地址（如果未傳入則查詢）
      if (!tenant) {
        tenant = await this.tenantRepository.findOne(
          { id: tenantId },
          { populate: [] }
        );
        if (!tenant) {
          throw new NotFoundException("租戶不存在");
        }
      }

      const executionWalletAddress =
        tenant.cryptoConfig.executionWalletAddress ||
        this.configService.get<string>("CONTRACT_EXECUTION_WALLET_ADDRESS") ||
        tenant.cryptoConfig.investmentContractAddress;

      if (!executionWalletAddress) {
        throw new BadRequestException("未設定執行合約的錢包地址");
      }

      // 從會員錢包轉到代理錢包
      const txHash = await this.tronService.transferUSDT(
        customer.wallet?.address || executionWalletAddress, // 從會員錢包
        fullAgent.wallet.address, // 到代理錢包
        selfAmount,
        tenant.cryptoConfig.usdtTokenAddress, // USDT Token 地址
        tenant.cryptoConfig.executionWalletPrivateKey // 執行合約的錢包私鑰
      );
      payout.txHash = txHash;
      payout.status = CommissionPayoutStatus.COMPLETED;
      payout.completedAt = new Date();
      payout.processedAt = new Date();

      // 第一次分潤自動驗證（僅直接推薦代理）
      if (payout.isFirstPayout && fullAgent.wallet) {
        fullAgent.wallet.verified = true;
        fullAgent.wallet.verifiedAt = new Date();
        fullAgent.wallet.verificationTxHash = txHash;
      }

      // 更新統計
      fullAgent.stats.totalCommissionEarned += selfAmount;
      fullAgent.stats.selfCommissionEarned += selfAmount;
      if (uplineAmount > 0.000001) {
        fullAgent.stats.uplineCommissionPassed += uplineAmount;
      }
      fullAgent.wallet.totalPaidAmount += selfAmount;
      fullAgent.wallet.lastPaidAt = new Date();
    } catch (error) {
      payout.status = CommissionPayoutStatus.FAILED;
      payout.txError = error instanceof Error ? error.message : String(error);
    }

    payouts.push(payout);

    // 如果有上級代理，繼續向上分潤
    if (fullAgent.parentAgent && uplineAmount > 0.000001) {
      await this.distributeAgentCommission(
        tenantId,
        customer,
        fullAgent.parentAgent,
        uplineAmount,
        investmentAmount,
        commissionRate,
        payouts,
        false, // 不是直接推薦代理
        fullAgent, // 來源代理
        visitedAgentIds, // 傳遞已訪問集合
        depth + 1, // 增加深度
        tenant // 傳遞租戶資訊避免重複查詢
      );
    } else if (uplineAmount > 0.000001) {
      // 如果沒有上級代理但還有剩餘佣金，給當前代理（頂級代理全拿）
      const remainingPayout = this.commissionPayoutRepository.create({
        tenant: tenantId,
        agent: fullAgent,
        customer,
        sourceAgent: sourceAgent || undefined,
        type: CommissionPayoutType.FROM_DOWNLINE,
        amount: uplineAmount.toFixed(6),
        originalInvestmentAmount: investmentAmount.toFixed(6),
        commissionRate,
        receivedAmount: uplineAmount.toFixed(6),
        selfRate: 100.0,
        passedToUplineAmount: "0",
        walletAddress: fullAgent.wallet.address,
        chain: "tron",
        status: CommissionPayoutStatus.PENDING,
      });

      try {
        // 獲取租戶配置和執行合約的錢包地址（如果未傳入則查詢）
        if (!tenant) {
          tenant = await this.tenantRepository.findOne(
            { id: tenantId },
            { populate: [] }
          );
          if (!tenant) {
            throw new NotFoundException("租戶不存在");
          }
        }

        const executionWalletAddress =
          tenant.cryptoConfig.executionWalletAddress ||
          this.configService.get<string>("CONTRACT_EXECUTION_WALLET_ADDRESS") ||
          tenant.cryptoConfig.investmentContractAddress;

        if (!executionWalletAddress) {
          throw new BadRequestException("未設定執行合約的錢包地址");
        }

        // 從會員錢包轉到代理錢包
        const txHash = await this.tronService.transferUSDT(
          customer.wallet?.address || executionWalletAddress, // 從會員錢包
          fullAgent.wallet.address, // 到代理錢包
          uplineAmount,
          tenant.cryptoConfig.usdtTokenAddress, // USDT Token 地址
          tenant.cryptoConfig.executionWalletPrivateKey // 執行合約的錢包私鑰
        );
        remainingPayout.txHash = txHash;
        remainingPayout.status = CommissionPayoutStatus.COMPLETED;
        remainingPayout.completedAt = new Date();
        remainingPayout.processedAt = new Date();

        // 更新統計
        fullAgent.stats.totalCommissionEarned += uplineAmount;
        fullAgent.stats.selfCommissionEarned += uplineAmount;
        if (fullAgent.wallet) {
          fullAgent.wallet.totalPaidAmount += uplineAmount;
          fullAgent.wallet.lastPaidAt = new Date();
        }
      } catch (error) {
        remainingPayout.status = CommissionPayoutStatus.FAILED;
        remainingPayout.txError =
          error instanceof Error ? error.message : String(error);
      }

      payouts.push(remainingPayout);
    }
  }

  /**
   * 生成隨機密碼（用於會員，因為會員不需要登入）
   */
  private generateRandomPassword(): string {
    // 生成 32 位隨機字串（包含大小寫字母、數字）
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let password = "";
    for (let i = 0; i < 32; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }
}
