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
} from "@saas-platform/database";
import { PasswordService } from "@saas-platform/auth";
import { ExecuteContractDto } from "./dto/execute-contract.dto";
import { ContractInfoDto } from "./dto/contract-info.dto";
import { ExecuteContractResponseDto } from "./dto/execute-contract-response.dto";

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
    private readonly em: EntityManager,
    private readonly passwordService: PasswordService
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

    // 獲取執行合約的錢包地址
    // 注意：執行合約的錢包應該在 platform-api 中設定，並同步到 tenant
    // 這裡暫時從環境變數或配置中獲取，實際應該從 platform-api 同步
    const executionWalletAddress =
      process.env.CONTRACT_EXECUTION_WALLET_ADDRESS ||
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
