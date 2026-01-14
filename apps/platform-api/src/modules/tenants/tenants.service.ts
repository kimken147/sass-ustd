import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@mikro-orm/nestjs";
import { EntityRepository, EntityManager } from "@mikro-orm/postgresql";
import { ConfigService } from "@nestjs/config";
import {
  Tenant,
  TenantStatus,
  TenantPlan,
  SystemWallet,
  SystemWalletType,
  SystemWalletStatus,
  SystemWalletAssignment,
} from "@saas-platform/database";
import { EncryptionService } from "@saas-platform/auth";
import { CreateTenantDto } from "./dto/create-tenant.dto";
import { UpdateTenantDto } from "./dto/update-tenant.dto";
import { TenantResponseDto } from "./dto/tenant-response.dto";
import { TenantMigrationService } from "./tenant-migration.service";

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepository: EntityRepository<Tenant>,
    @InjectRepository(SystemWallet)
    private readonly systemWalletRepository: EntityRepository<SystemWallet>,
    private readonly em: EntityManager,
    private readonly configService: ConfigService,
    private readonly encryptionService: EncryptionService,
    private readonly tenantMigrationService: TenantMigrationService
  ) {}

  /**
   * 創建新租戶
   * 1. 在 Platform DB 中創建 Tenant 記錄
   * 2. 創建租戶的獨立資料庫
   * 3. 運行遷移初始化資料庫結構
   */
  async create(createTenantDto: CreateTenantDto): Promise<TenantResponseDto> {
    // 檢查 slug 是否已存在
    const existingTenant = await this.tenantRepository.findOne({
      slug: createTenantDto.slug,
    });

    if (existingTenant) {
      throw new ConflictException(`租戶 slug "${createTenantDto.slug}" 已存在`);
    }

    // 檢查 email 是否已存在（僅當提供了 email 時）
    if (createTenantDto.email) {
      const existingEmail = await this.tenantRepository.findOne({
        email: createTenantDto.email,
      });

      if (existingEmail) {
        throw new ConflictException(
          `電子郵件 "${createTenantDto.email}" 已被使用`
        );
      }
    }

    // 處理系統錢包指派（如果提供）
    let systemWalletsWithDetails: SystemWalletAssignment[] | undefined;
    if (
      createTenantDto.systemWallets &&
      createTenantDto.systemWallets.length > 0
    ) {
      // 驗證系統錢包指派
      await this.validateSystemWallets(createTenantDto.systemWallets);

      // 獲取系統錢包的完整資訊並填充到 systemWallets
      const walletIds = createTenantDto.systemWallets.map((sw) => sw.walletId);
      const wallets = await this.systemWalletRepository.find({
        id: { $in: walletIds },
        type: SystemWalletType.REVENUE_DISTRIBUTION,
      });

      // 確保所有錢包都找到了
      if (wallets.length !== walletIds.length) {
        const foundIds = wallets.map((w) => w.id);
        const missingIds = walletIds.filter((id) => !foundIds.includes(id));
        throw new NotFoundException(
          `找不到系統錢包 ID: ${missingIds.join(", ")}`
        );
      }

      // 構建包含完整資訊的系統錢包指派
      systemWalletsWithDetails = createTenantDto.systemWallets.map((sw) => {
        const wallet = wallets.find((w) => w.id === sw.walletId);
        if (!wallet) {
          throw new NotFoundException(`系統錢包 ID ${sw.walletId} 不存在`);
        }
        return {
          walletId: wallet.id,
          address: wallet.address,
          name: wallet.name,
          chain: wallet.chain,
          percentage: sw.percentage,
          syncedAt: new Date(),
        };
      });
    }

    // 處理 cryptoConfig
    let cryptoConfig = createTenantDto.cryptoConfig || {
      supportedChains: ["tron"],
      supportedTokens: ["USDT", "TRX"],
      investmentContractAddress: "",
      usdtTokenAddress: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
      minInvestment: 100,
      maxInvestment: 100000,
      tenantRevenueRate: 60.0,
      agentCommissionRate: 30.0,
    };

    // 如果提供了 executionWalletId，從 SystemWallet 獲取地址和私鑰
    if (cryptoConfig.executionWalletId) {
      const executionWallet = await this.systemWalletRepository.findOne({
        id: cryptoConfig.executionWalletId,
        type: SystemWalletType.CONTRACT_EXECUTION,
        status: SystemWalletStatus.ACTIVE,
      });

      if (!executionWallet) {
        throw new NotFoundException(
          `執行合約錢包 ID ${cryptoConfig.executionWalletId} 不存在或不是執行合約類型`
        );
      }

      if (!executionWallet.privateKey) {
        throw new BadRequestException(
          `執行合約錢包 ID ${cryptoConfig.executionWalletId} 未設定私鑰`
        );
      }

      // 將地址和加密的私鑰複製到 cryptoConfig（供 tenant-api 使用）
      // 注意：私鑰已經是加密的，直接複製即可
      cryptoConfig = {
        ...cryptoConfig,
        executionWalletAddress: executionWallet.address,
        executionWalletPrivateKey: executionWallet.privateKey,
      };
    }

    // 創建租戶實體
    const tenant = this.em.create(Tenant, {
      name: createTenantDto.name,
      slug: createTenantDto.slug,
      email: createTenantDto.email,
      plan: createTenantDto.plan || TenantPlan.TRIAL,
      status: createTenantDto.status || TenantStatus.ACTIVE,
      trialEndsAt: createTenantDto.trialEndsAt,
      customUrl: createTenantDto.customUrl,
      customDomain: createTenantDto.customDomain,
      branding: createTenantDto.branding,
      systemFeeRate: createTenantDto.systemFeeRate || 10.0,
      cryptoConfig,
      revenueWallets: createTenantDto.revenueWallets || [],
      systemWallets: systemWalletsWithDetails,
    });

    await this.em.flush();

    // 創建租戶資料庫
    try {
      await this.createTenantDatabase(tenant.slug);
    } catch (error) {
      // 如果資料庫創建失敗，刪除已創建的租戶記錄
      await this.em.removeAndFlush(tenant);
      throw new BadRequestException(`創建租戶資料庫失敗: ${error.message}`);
    }

    // 創建管理員用戶
    try {
      await this.tenantMigrationService.createAdminUserForTenant(
        tenant.slug,
        tenant,
        createTenantDto.adminUsername,
        createTenantDto.adminPassword,
        createTenantDto.adminName
      );
    } catch (error) {
      // 如果創建管理員用戶失敗，記錄錯誤但不清除資料庫（可手動修復）
      throw new BadRequestException(`創建管理員用戶失敗: ${error.message}`);
    }

    return TenantResponseDto.fromEntity(tenant);
  }

  /**
   * 查詢所有租戶
   */
  async findAll(): Promise<TenantResponseDto[]> {
    const tenants = await this.tenantRepository.findAll();
    return tenants.map((tenant) => TenantResponseDto.fromEntity(tenant));
  }

  /**
   * 根據 ID 查詢租戶
   */
  async findOne(id: number): Promise<TenantResponseDto> {
    const tenant = await this.tenantRepository.findOne({ id });

    if (!tenant) {
      throw new NotFoundException(`租戶 ID ${id} 不存在`);
    }

    return TenantResponseDto.fromEntity(tenant);
  }

  /**
   * 根據 slug 查詢租戶
   */
  async findBySlug(slug: string): Promise<TenantResponseDto> {
    const tenant = await this.tenantRepository.findOne({ slug });

    if (!tenant) {
      throw new NotFoundException(`租戶 slug "${slug}" 不存在`);
    }

    return TenantResponseDto.fromEntity(tenant);
  }

  /**
   * 更新租戶
   */
  async update(
    id: number,
    updateTenantDto: UpdateTenantDto
  ): Promise<TenantResponseDto> {
    const tenant = await this.tenantRepository.findOne({ id });

    if (!tenant) {
      throw new NotFoundException(`租戶 ID ${id} 不存在`);
    }

    // 如果更新 slug，檢查是否衝突
    if (updateTenantDto.slug && updateTenantDto.slug !== tenant.slug) {
      const existing = await this.tenantRepository.findOne({
        slug: updateTenantDto.slug,
      });
      if (existing) {
        throw new ConflictException(
          `租戶 slug "${updateTenantDto.slug}" 已存在`
        );
      }
    }

    // 如果更新 email，檢查是否衝突
    if (updateTenantDto.email && updateTenantDto.email !== tenant.email) {
      const existing = await this.tenantRepository.findOne({
        email: updateTenantDto.email,
      });
      if (existing) {
        throw new ConflictException(
          `電子郵件 "${updateTenantDto.email}" 已被使用`
        );
      }
    }

    // 處理系統錢包指派（如果提供）
    let systemWalletsWithDetails: SystemWalletAssignment[] | undefined;
    if (
      updateTenantDto.systemWallets &&
      updateTenantDto.systemWallets.length > 0
    ) {
      // 驗證系統錢包指派
      await this.validateSystemWallets(updateTenantDto.systemWallets);

      // 獲取系統錢包的完整資訊並填充到 systemWallets
      const walletIds = updateTenantDto.systemWallets.map((sw) => sw.walletId);
      const wallets = await this.systemWalletRepository.find({
        id: { $in: walletIds },
        type: SystemWalletType.REVENUE_DISTRIBUTION,
      });

      // 確保所有錢包都找到了
      if (wallets.length !== walletIds.length) {
        const foundIds = wallets.map((w) => w.id);
        const missingIds = walletIds.filter((id) => !foundIds.includes(id));
        throw new NotFoundException(
          `找不到系統錢包 ID: ${missingIds.join(", ")}`
        );
      }

      // 構建包含完整資訊的系統錢包指派
      systemWalletsWithDetails = updateTenantDto.systemWallets.map((sw) => {
        const wallet = wallets.find((w) => w.id === sw.walletId);
        if (!wallet) {
          throw new NotFoundException(`系統錢包 ID ${sw.walletId} 不存在`);
        }
        return {
          walletId: wallet.id,
          address: wallet.address,
          name: wallet.name,
          chain: wallet.chain,
          percentage: sw.percentage,
          syncedAt: new Date(),
        };
      });
    }

    // 更新租戶
    const updateData: any = { ...updateTenantDto };

    // 如果提供了 systemWallets，使用填充完整資訊的版本
    if (systemWalletsWithDetails) {
      updateData.systemWallets = systemWalletsWithDetails;
    }

    // 如果更新了 cryptoConfig 且提供了 executionWalletId，從 SystemWallet 獲取地址和私鑰
    if (updateData.cryptoConfig?.executionWalletId) {
      const executionWallet = await this.systemWalletRepository.findOne({
        id: updateData.cryptoConfig.executionWalletId,
        type: SystemWalletType.CONTRACT_EXECUTION,
        status: SystemWalletStatus.ACTIVE,
      });

      if (!executionWallet) {
        throw new NotFoundException(
          `執行合約錢包 ID ${updateData.cryptoConfig.executionWalletId} 不存在或不是執行合約類型`
        );
      }

      if (!executionWallet.privateKey) {
        throw new BadRequestException(
          `執行合約錢包 ID ${updateData.cryptoConfig.executionWalletId} 未設定私鑰`
        );
      }

      // 將地址和加密的私鑰複製到 cryptoConfig（供 tenant-api 使用）
      updateData.cryptoConfig = {
        ...updateData.cryptoConfig,
        executionWalletAddress: executionWallet.address,
        executionWalletPrivateKey: executionWallet.privateKey,
      };
    }

    this.em.assign(tenant, updateData);
    await this.em.flush();

    return TenantResponseDto.fromEntity(tenant);
  }

  /**
   * 刪除租戶（軟刪除）
   */
  async remove(id: number): Promise<void> {
    const tenant = await this.tenantRepository.findOne({ id });

    if (!tenant) {
      throw new NotFoundException(`租戶 ID ${id} 不存在`);
    }

    // 軟刪除
    tenant.status = TenantStatus.INACTIVE;
    await this.em.flush();
  }

  /**
   * 創建租戶資料庫
   * 使用 PostgreSQL 的 CREATE DATABASE 命令
   */
  private async createTenantDatabase(slug: string): Promise<void> {
    const dbHost = this.configService.get<string>(
      "PLATFORM_DB_HOST",
      "localhost"
    );
    const dbPort = this.configService.get<number>("PLATFORM_DB_PORT", 5432);
    const dbUser = this.configService.get<string>(
      "PLATFORM_DB_USER",
      "postgres"
    );
    const dbPassword = this.configService.get<string>(
      "PLATFORM_DB_PASSWORD",
      "postgres"
    );

    const dbName = `tenant_${slug}`;

    // 使用 PostgreSQL 客戶端創建資料庫
    // 注意：這裡使用原生 SQL，因為 MikroORM 不直接支持 CREATE DATABASE
    const { Client } = require("pg");

    const client = new Client({
      host: dbHost,
      port: dbPort,
      user: dbUser,
      password: dbPassword,
      database: "postgres", // 連接到 postgres 資料庫以創建新資料庫
    });

    try {
      await client.connect();

      // 檢查資料庫是否已存在
      const checkResult = await client.query(
        `SELECT 1 FROM pg_database WHERE datname = $1`,
        [dbName]
      );

      if (checkResult.rows.length > 0) {
        throw new ConflictException(`資料庫 "${dbName}" 已存在`);
      }

      // 創建資料庫
      await client.query(`CREATE DATABASE ${dbName}`);
    } catch (error) {
      throw new BadRequestException(`創建資料庫失敗: ${error.message}`);
    } finally {
      await client.end();
    }

    // 創建資料庫成功後，執行 migration 初始化資料庫結構
    try {
      await this.tenantMigrationService.runMigrationsForTenant(slug);
    } catch (error) {
      // 如果 migration 失敗，嘗試刪除已創建的資料庫（可選，根據需求決定）
      // 這裡我們選擇讓 migration 失敗時也保留資料庫，方便後續手動修復
      throw new BadRequestException(
        `執行租戶資料庫 migration 失敗: ${error.message}`
      );
    }
  }

  /**
   * 檢查租戶資料庫是否存在
   */
  async checkTenantDatabase(slug: string): Promise<boolean> {
    const dbHost = this.configService.get<string>(
      "PLATFORM_DB_HOST",
      "localhost"
    );
    const dbPort = this.configService.get<number>("PLATFORM_DB_PORT", 5432);
    const dbUser = this.configService.get<string>(
      "PLATFORM_DB_USER",
      "postgres"
    );
    const dbPassword = this.configService.get<string>(
      "PLATFORM_DB_PASSWORD",
      "postgres"
    );

    const dbName = `tenant_${slug}`;
    const { Client } = require("pg");

    const client = new Client({
      host: dbHost,
      port: dbPort,
      user: dbUser,
      password: dbPassword,
      database: "postgres",
    });

    try {
      await client.connect();
      const result = await client.query(
        `SELECT 1 FROM pg_database WHERE datname = $1`,
        [dbName]
      );
      return result.rows.length > 0;
    } finally {
      await client.end();
    }
  }

  /**
   * 驗證系統錢包指派
   * 1. 檢查所有錢包是否存在且為分潤類型
   * 2. 檢查比例總和是否等於 100%
   * 3. 檢查比例是否為整數
   * 4. 檢查是否有重複的錢包 ID
   */
  private async validateSystemWallets(
    systemWallets: Array<{ walletId: number; percentage: number }>
  ): Promise<void> {
    // 檢查是否為空陣列
    if (systemWallets.length === 0) {
      throw new BadRequestException("系統錢包指派不能為空");
    }

    // 檢查比例是否為整數
    for (const sw of systemWallets) {
      if (!Number.isInteger(sw.percentage)) {
        throw new BadRequestException(
          `系統錢包比例必須為整數，錢包 ID ${sw.walletId} 的比例為 ${sw.percentage}`
        );
      }

      // 檢查比例範圍
      if (sw.percentage < 1 || sw.percentage > 100) {
        throw new BadRequestException(
          `系統錢包比例必須在 1-100 之間，錢包 ID ${sw.walletId} 的比例為 ${sw.percentage}`
        );
      }
    }

    // 檢查比例總和是否等於 100%
    const totalPercentage = systemWallets.reduce(
      (sum, sw) => sum + sw.percentage,
      0
    );

    if (totalPercentage !== 100) {
      throw new BadRequestException(
        `系統錢包比例總和必須等於 100%，當前為 ${totalPercentage}%`
      );
    }

    // 檢查是否有重複的錢包 ID
    const walletIds = systemWallets.map((sw) => sw.walletId);
    const uniqueIds = new Set(walletIds);
    if (uniqueIds.size !== walletIds.length) {
      const duplicates = walletIds.filter(
        (id, index) => walletIds.indexOf(id) !== index
      );
      throw new BadRequestException(
        `系統錢包指派中不能有重複的錢包 ID: ${[...new Set(duplicates)].join(", ")}`
      );
    }

    // 檢查所有錢包是否存在且為分潤類型
    const wallets = await this.systemWalletRepository.find({
      id: { $in: walletIds },
      type: SystemWalletType.REVENUE_DISTRIBUTION,
      status: SystemWalletStatus.ACTIVE,
    });

    if (wallets.length !== walletIds.length) {
      const foundIds = wallets.map((w) => w.id);
      const missingIds = walletIds.filter((id) => !foundIds.includes(id));
      throw new NotFoundException(
        `找不到系統錢包 ID: ${missingIds.join(", ")}, 或錢包類型不是分潤類型，或錢包狀態不是活躍狀態`
      );
    }
  }
}
