import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository, EntityManager } from '@mikro-orm/postgresql';
import {
  TenantUser,
  UserRole,
  UserStatus,
  Agent,
  AgentStatus,
  AgentCommission,
  AgentWallet,
  TenantConfig,
} from '@saas-platform/database';
import { PasswordService } from '@saas-platform/auth';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';

/**
 * 代理服務
 *
 * 使用獨立的 Tenant DB，配置存放在 tenant_config 表（只有一筆記錄）
 * 因此不需要 tenantId 參數
 */
@Injectable()
export class AgentsService {
  constructor(
    @InjectRepository(TenantUser)
    private readonly userRepository: EntityRepository<TenantUser>,
    @InjectRepository(Agent)
    private readonly agentRepository: EntityRepository<Agent>,
    @InjectRepository(TenantConfig)
    private readonly tenantConfigRepository: EntityRepository<TenantConfig>,
    private readonly em: EntityManager,
    private readonly passwordService: PasswordService,
  ) {}

  /**
   * 獲取租戶配置（只有一筆）
   */
  private async getTenantConfig(): Promise<TenantConfig> {
    const config = await this.tenantConfigRepository.findOne({ id: 1 });
    if (!config) {
      throw new NotFoundException('租戶配置不存在，請先初始化');
    }
    return config;
  }

  /**
   * 獲取代理列表（排除站長，只顯示 level > 0 的代理）
   */
  async getAgents(): Promise<Agent[]> {
    return this.agentRepository.find(
      { level: { $gt: 0 } },
      {
        populate: ['user', 'parentAgent'],
        orderBy: { level: 'ASC', createdAt: 'DESC' },
      },
    );
  }

  /**
   * 獲取單個代理
   */
  async getAgent(agentId: number): Promise<Agent> {
    const agent = await this.agentRepository.findOne(
      { id: agentId },
      { populate: ['user', 'parentAgent'] },
    );

    if (!agent) {
      throw new NotFoundException('代理不存在');
    }

    return agent;
  }

  /**
   * 獲取指定代理的下級代理列表（支援層級查詢）
   * 使用 path 字段進行高效查詢：查找所有 path 以 "root/{agentId}" 開頭的代理
   */
  async getSubAgents(agentId: number): Promise<Agent[]> {
    // 先獲取當前代理，確認其存在
    const currentAgent = await this.agentRepository.findOne(
      { id: agentId },
      { populate: ['user', 'parentAgent'] },
    );

    if (!currentAgent) {
      throw new NotFoundException('代理不存在');
    }

    // 查詢直接下級（parentAgent = currentAgent）
    const subAgents = await this.agentRepository.find(
      { parentAgent: agentId },
      {
        populate: ['user', 'parentAgent'],
        orderBy: { level: 'ASC', createdAt: 'DESC' },
      },
    );

    return subAgents;
  }

  /**
   * 創建代理
   * 1. 創建 TenantUser（role = AGENT）
   * 2. 創建 Agent
   * 3. 計算 level 和 path
   * 4. 設定分潤比率和錢包
   */
  async createAgent(dto: CreateAgentDto): Promise<Agent> {
    const config = await this.getTenantConfig();

    // 驗證上級比率範圍
    const uplineRate = dto.uplineRate;
    if (uplineRate < 0 || uplineRate > 100) {
      throw new BadRequestException('上級比率必須在 0% 到 100% 之間');
    }

    // 自動計算自己保留比率：selfRate = 100 - uplineRate
    const selfRate = 100 - uplineRate;

    // 檢查 username 是否已存在
    const existingUser = await this.userRepository.findOne({
      username: dto.username,
    });
    if (existingUser) {
      throw new ConflictException('該帳號已存在');
    }

    // 檢查 email 是否已存在（只有當 email 有值時才檢查）
    if (dto.email) {
      const existingEmail = await this.userRepository.findOne({
        email: dto.email,
      });
      if (existingEmail) {
        throw new ConflictException('該 Email 已存在');
      }
    }

    // 自動生成唯一的代理碼（邀請碼）
    const agentCode = await this.generateUniqueAgentCode();

    // 獲取上級代理
    let parentAgent: Agent | null = null;
    let level = 0;
    let path = 'root';

    if (dto.parentAgentId !== undefined) {
      // 如果提供了上級代理 ID，使用指定的上級
      parentAgent = await this.agentRepository.findOne({
        id: dto.parentAgentId,
      });

      if (!parentAgent) {
        throw new NotFoundException('上級代理不存在');
      }

      level = parentAgent.level + 1;
      path = `${parentAgent.path}/${parentAgent.id}`;
    } else {
      // 如果沒有提供上級代理 ID，預設上級為站長（頂級代理，level = 0, parentAgent = null）
      parentAgent = await this.agentRepository.findOne(
        {
          level: 0,
          parentAgent: null,
        },
        { populate: ['user'] },
      );

      if (!parentAgent) {
        throw new NotFoundException(
          '找不到站長的代理記錄。請先為站長創建代理記錄。',
        );
      }

      level = parentAgent.level + 1;
      path = `${parentAgent.path}/${parentAgent.id}`;
    }

    // 獲取租戶的代理佣金率（baseRate）
    const baseRate = config.cryptoConfig.agentCommissionRate || 30.0;

    // 創建 TenantUser
    const hashedPassword = await this.passwordService.hashPassword(dto.password);
    const user = this.userRepository.create({
      username: dto.username,
      email: dto.email, // email 是可選的，可以是 undefined
      password: hashedPassword,
      name: dto.name,
      role: UserRole.AGENT,
      status: UserStatus.ACTIVE,
      // 在獨立的 Tenant DB 中，不需要設定 tenant 關聯
    });

    // 創建 Agent
    const commission: AgentCommission = {
      baseRate,
      selfRate: selfRate,
      uplineRate: uplineRate,
      isEnabled: true,
    };

    const wallet: AgentWallet = {
      address: dto.walletAddress,
      chain: 'tron',
      verified: false,
      totalPaidAmount: 0,
    };

    const agent = this.agentRepository.create({
      // 在獨立的 Tenant DB 中，不需要設定 tenant 關聯
      user,
      name: dto.name,
      code: agentCode,
      parentAgent: parentAgent || undefined,
      path,
      level,
      wallet,
      commission,
      status: AgentStatus.ACTIVE,
      notes: dto.notes,
    });

    // 如果創建的是下級代理，更新上級代理的統計
    if (parentAgent) {
      parentAgent.stats.directSubAgents += 1;
      parentAgent.stats.totalSubAgents += 1;
    }

    await this.em.flush();

    return agent;
  }

  /**
   * 更新代理
   */
  async updateAgent(agentId: number, dto: UpdateAgentDto): Promise<Agent> {
    const agent = await this.agentRepository.findOne(
      { id: agentId },
      { populate: ['user', 'parentAgent'] },
    );

    if (!agent) {
      throw new NotFoundException('代理不存在');
    }

    // 更新基本資訊
    if (dto.name !== undefined) {
      agent.name = dto.name;
      if (agent.user) {
        agent.user.name = dto.name;
      }
    }

    // 更新分潤比率
    if (dto.uplineRate !== undefined) {
      // 驗證上級比率範圍
      if (dto.uplineRate < 0 || dto.uplineRate > 100) {
        throw new BadRequestException('上級比率必須在 0% 到 100% 之間');
      }

      // 自動計算自己保留比率：selfRate = 100 - uplineRate
      const selfRate = 100 - dto.uplineRate;

      agent.commission.selfRate = selfRate;
      agent.commission.uplineRate = dto.uplineRate;
    }

    // 更新錢包地址
    if (dto.walletAddress !== undefined) {
      if (!agent.wallet) {
        agent.wallet = {
          address: dto.walletAddress,
          chain: 'tron',
          verified: false,
          totalPaidAmount: 0,
        };
      } else {
        // 如果地址改變，重置驗證狀態
        if (agent.wallet.address !== dto.walletAddress) {
          agent.wallet.address = dto.walletAddress;
          agent.wallet.verified = false;
          agent.wallet.verifiedAt = undefined;
          agent.wallet.verificationTxHash = undefined;
        }
      }
    }

    // 更新狀態
    if (dto.isActive !== undefined) {
      agent.status = dto.isActive ? AgentStatus.ACTIVE : AgentStatus.INACTIVE;
      if (agent.user) {
        agent.user.status = dto.isActive ? UserStatus.ACTIVE : UserStatus.INACTIVE;
      }
    }

    // 更新備註
    if (dto.notes !== undefined) {
      agent.notes = dto.notes;
    }

    await this.em.flush();

    return agent;
  }

  /**
   * 刪除代理（軟刪除）
   */
  async deleteAgent(agentId: number): Promise<void> {
    const agent = await this.agentRepository.findOne(
      { id: agentId },
      { populate: ['user'] },
    );

    if (!agent) {
      throw new NotFoundException('代理不存在');
    }

    // 檢查是否有下級代理
    const subAgents = await this.agentRepository.find({ parentAgent: agentId });

    if (subAgents.length > 0) {
      throw new BadRequestException(
        '無法刪除該代理，因為存在下級代理。請先處理下級代理。',
      );
    }

    // 軟刪除：停用代理和用戶
    agent.status = AgentStatus.INACTIVE;
    if (agent.user) {
      agent.user.status = UserStatus.INACTIVE;
    }

    // 更新上級代理的統計
    if (agent.parentAgent) {
      const parentAgent = await this.agentRepository.findOne({
        id: agent.parentAgent.id,
      });
      if (parentAgent) {
        parentAgent.stats.directSubAgents = Math.max(
          0,
          parentAgent.stats.directSubAgents - 1,
        );
        parentAgent.stats.totalSubAgents = Math.max(
          0,
          parentAgent.stats.totalSubAgents - 1,
        );
      }
    }

    await this.em.flush();
  }

  /**
   * 生成唯一的代理碼
   */
  private async generateUniqueAgentCode(): Promise<string> {
    let code: string;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 100;

    while (!isUnique && attempts < maxAttempts) {
      // 生成 6 位隨機碼
      const randomNum = Math.floor(Math.random() * 1000000);
      code = `AG${randomNum.toString().padStart(6, '0')}`;

      const existing = await this.agentRepository.findOne({ code });

      if (!existing) {
        isUnique = true;
      }

      attempts++;
    }

    if (!isUnique) {
      throw new Error('無法生成唯一的代理碼，請手動指定');
    }

    return code!;
  }
}
