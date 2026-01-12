import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository, EntityManager } from '@mikro-orm/postgresql';
import {
  User,
  UserRole,
  UserStatus,
  Agent,
  AgentStatus,
  AgentCommission,
  AgentWallet,
  Tenant,
} from '@saas-platform/database';
import { PasswordService } from '@saas-platform/auth';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';

@Injectable()
export class AgentsService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: EntityRepository<User>,
    @InjectRepository(Agent)
    private readonly agentRepository: EntityRepository<Agent>,
    @InjectRepository(Tenant)
    private readonly tenantRepository: EntityRepository<Tenant>,
    private readonly em: EntityManager,
    private readonly passwordService: PasswordService,
  ) {}

  /**
   * 獲取代理列表
   */
  async getAgents(tenantId: number): Promise<Agent[]> {
    return this.agentRepository.find(
      { tenant: tenantId },
      {
        populate: ['user', 'parentAgent', 'tenant'],
        orderBy: { level: 'ASC', createdAt: 'DESC' },
      },
    );
  }

  /**
   * 獲取單個代理
   */
  async getAgent(tenantId: number, agentId: number): Promise<Agent> {
    const agent = await this.agentRepository.findOne(
      { id: agentId, tenant: tenantId },
      {
        populate: ['user', 'parentAgent', 'tenant'],
      },
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
  async getSubAgents(
    tenantId: number,
    agentId: number,
  ): Promise<Agent[]> {
    // 先獲取當前代理，確認其存在
    const currentAgent = await this.agentRepository.findOne(
      { id: agentId, tenant: tenantId },
      {
        populate: ['user', 'parentAgent', 'tenant'],
      },
    );

    if (!currentAgent) {
      throw new NotFoundException('代理不存在');
    }

    // 構建查詢條件：查找所有 parentAgent 為當前代理的代理
    // 或者使用 path 查詢：path 以 "root/{agentId}" 或 "{currentAgent.path}/{agentId}" 開頭
    const pathPrefix = currentAgent.path === 'root' 
      ? `root/${agentId}` 
      : `${currentAgent.path}/${agentId}`;

    // 查詢直接下級（parentAgent = currentAgent）
    const subAgents = await this.agentRepository.find(
      {
        parentAgent: agentId,
        tenant: tenantId,
      },
      {
        populate: ['user', 'parentAgent', 'tenant'],
        orderBy: { level: 'ASC', createdAt: 'DESC' },
      },
    );

    return subAgents;
  }

  /**
   * 創建代理
   * 1. 創建 User（role = AGENT）
   * 2. 創建 Agent
   * 3. 計算 level 和 path
   * 4. 設定分潤比率和錢包
   */
  async createAgent(
    tenantId: number,
    dto: CreateAgentDto,
  ): Promise<Agent> {
    const tenant = await this.tenantRepository.findOne({ id: tenantId });
    if (!tenant) {
      throw new NotFoundException('租戶不存在');
    }

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
      tenant: tenantId,
    });
    if (existingUser) {
      throw new ConflictException('該帳號已存在');
    }

    // 檢查 email 是否已存在
    const existingEmail = await this.userRepository.findOne({
      email: dto.email,
      tenant: tenantId,
    });
    if (existingEmail) {
      throw new ConflictException('該 Email 已存在');
    }

    // 自動生成唯一的代理碼（邀請碼）
    const agentCode = await this.generateUniqueAgentCode(tenantId);

    // 獲取上級代理
    let parentAgent: Agent | null = null;
    let level = 0;
    let path = 'root';

    if (dto.parentAgentId !== undefined) {
      // 如果提供了上級代理 ID，使用指定的上級
      parentAgent = await this.agentRepository.findOne({
        id: dto.parentAgentId,
        tenant: tenantId,
      });

      if (!parentAgent) {
        throw new NotFoundException('上級代理不存在');
      }

      level = parentAgent.level + 1;
      path = `${parentAgent.path}/${parentAgent.id}`;
    } else {
      // 如果沒有提供上級代理 ID，預設上級為站長（頂級代理，level = 0, parentAgent = null）
      parentAgent = await this.agentRepository.findOne({
        tenant: tenantId,
        level: 0,
        parentAgent: null,
      }, {
        populate: ['user'],
      });

      if (!parentAgent) {
        throw new NotFoundException(
          '找不到站長的代理記錄。請先為站長創建代理記錄。',
        );
      }

      level = parentAgent.level + 1;
      path = `${parentAgent.path}/${parentAgent.id}`;
    }

    // 獲取租戶的代理佣金率（baseRate）
    const baseRate = tenant.cryptoConfig.agentCommissionRate || 30.0;

    // 創建 User
    const hashedPassword = await this.passwordService.hashPassword(dto.password);
    const user = this.userRepository.create({
      username: dto.username,
      email: dto.email,
      password: hashedPassword,
      name: dto.name,
      role: UserRole.AGENT,
      status: UserStatus.ACTIVE,
      tenant: tenantId,
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
      tenant: tenantId,
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
  async updateAgent(
    tenantId: number,
    agentId: number,
    dto: UpdateAgentDto,
  ): Promise<Agent> {
    const agent = await this.agentRepository.findOne(
      { id: agentId, tenant: tenantId },
      {
        populate: ['user', 'parentAgent'],
      },
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
      agent.status = dto.isActive
        ? AgentStatus.ACTIVE
        : AgentStatus.INACTIVE;
      if (agent.user) {
        agent.user.status = dto.isActive
          ? UserStatus.ACTIVE
          : UserStatus.INACTIVE;
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
  async deleteAgent(tenantId: number, agentId: number): Promise<void> {
    const agent = await this.agentRepository.findOne(
      { id: agentId, tenant: tenantId },
      {
        populate: ['user'],
      },
    );

    if (!agent) {
      throw new NotFoundException('代理不存在');
    }

    // 檢查是否有下級代理
    const subAgents = await this.agentRepository.find({
      parentAgent: agentId,
      tenant: tenantId,
    });

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
  private async generateUniqueAgentCode(tenantId: number): Promise<string> {
    let code: string;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 100;

    while (!isUnique && attempts < maxAttempts) {
      // 生成 6 位隨機碼
      const randomNum = Math.floor(Math.random() * 1000000);
      code = `AG${randomNum.toString().padStart(6, '0')}`;

      const existing = await this.agentRepository.findOne({
        code,
        tenant: tenantId,
      });

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
