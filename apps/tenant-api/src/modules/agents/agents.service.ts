import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  Logger,
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
  AgentCommissionSetting,
} from '@saas-platform/database';
import { PasswordService } from '@saas-platform/auth';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';

/**
 * 代理链节点（用于分润计算）
 */
export interface AgentChainNode {
  agent: Agent;
  allocatedRate: number;  // 被分配的全局比率
  selfRate: number;       // 自己保留的比率（allocatedRate - 下级的 allocatedRate）
}

/**
 * 代理服务
 *
 * 使用独立的 Tenant DB，配置存放在 tenant_config 表（只有一笔记录）
 * 因此不需要 tenantId 参数
 */
@Injectable()
export class AgentsService {
  private readonly logger = new Logger(AgentsService.name);

  constructor(
    @InjectRepository(TenantUser)
    private readonly userRepository: EntityRepository<TenantUser>,
    @InjectRepository(Agent)
    private readonly agentRepository: EntityRepository<Agent>,
    @InjectRepository(TenantConfig)
    private readonly tenantConfigRepository: EntityRepository<TenantConfig>,
    @InjectRepository(AgentCommissionSetting)
    private readonly commissionSettingRepository: EntityRepository<AgentCommissionSetting>,
    private readonly em: EntityManager,
    private readonly passwordService: PasswordService,
  ) {}

  /**
   * 获取租户配置（只有一笔）
   */
  private async getTenantConfig(): Promise<TenantConfig> {
    const config = await this.tenantConfigRepository.findOne({ id: 1 });
    if (!config) {
      throw new NotFoundException('租户配置不存在，请先初始化');
    }
    return config;
  }

  /**
   * 获取代理列表（排除站长，只显示 level > 0 的代理）
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
   * 获取单个代理
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
   * 获取代理被分配的全局比率
   */
  async getAgentAllocatedRate(agentId: number): Promise<number> {
    const setting = await this.commissionSettingRepository.findOne({
      childAgent: agentId,
    });

    if (!setting) {
      // 如果没有找到，可能是站长（顶级代理）
      const agent = await this.agentRepository.findOne({ id: agentId });
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
  async getAgentChainWithRates(startAgent: Agent): Promise<AgentChainNode[]> {
    const chain: AgentChainNode[] = [];
    let currentAgent: Agent | null = startAgent;
    let previousAllocatedRate = 0;

    // 预加载代理关系
    await this.em.populate(startAgent, ['parentAgent']);

    while (currentAgent) {
      // 获取当前代理被分配的比率
      const allocatedRate = await this.getAgentAllocatedRate(currentAgent.id);

      // 计算 selfRate（自己保留的比率）
      // selfRate = 自己的 allocatedRate - 下级的 allocatedRate
      const selfRate = allocatedRate - previousAllocatedRate;

      chain.push({
        agent: currentAgent,
        allocatedRate,
        selfRate,
      });

      previousAllocatedRate = allocatedRate;

      // 移动到上级代理
      if (currentAgent.parentAgent) {
        await this.em.populate(currentAgent, ['parentAgent']);
        currentAgent = currentAgent.parentAgent;
      } else {
        currentAgent = null;
      }
    }

    return chain;
  }

  /**
   * 获取指定代理的下级代理列表
   */
  async getSubAgents(agentId: number): Promise<Agent[]> {
    const currentAgent = await this.agentRepository.findOne(
      { id: agentId },
      { populate: ['user', 'parentAgent'] },
    );

    if (!currentAgent) {
      throw new NotFoundException('代理不存在');
    }

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
   * 创建代理
   * 1. 创建 TenantUser（role = AGENT）
   * 2. 创建 Agent
   * 3. 创建 AgentCommissionSetting
   * 4. 计算 level 和 path
   */
  async createAgent(dto: CreateAgentDto): Promise<Agent> {
    const config = await this.getTenantConfig();

    // 验证分配比率范围
    const allocatedRate = dto.allocatedRate;
    if (allocatedRate <= 0 || allocatedRate > 100) {
      throw new BadRequestException('分配比率必须在 0% 到 100% 之间');
    }

    // 检查 username 是否已存在
    const existingUser = await this.userRepository.findOne({
      username: dto.username,
    });
    if (existingUser) {
      throw new ConflictException('该账号已存在');
    }

    // 检查 email 是否已存在
    if (dto.email) {
      const existingEmail = await this.userRepository.findOne({
        email: dto.email,
      });
      if (existingEmail) {
        throw new ConflictException('该 Email 已存在');
      }
    }

    // 自动生成唯一的代理码
    const agentCode = await this.generateUniqueAgentCode();

    // 获取上级代理
    let parentAgent: Agent | null = null;
    let level = 0;
    let path = 'root';
    let maxAllocatedRate: number;

    if (dto.parentAgentId !== undefined) {
      // 使用指定的上级
      parentAgent = await this.agentRepository.findOne({
        id: dto.parentAgentId,
      });

      if (!parentAgent) {
        throw new NotFoundException('上级代理不存在');
      }

      // 获取上级代理被分配的比率
      const parentAllocatedRate = await this.getAgentAllocatedRate(parentAgent.id);
      maxAllocatedRate = parentAllocatedRate;

      level = parentAgent.level + 1;
      path = `${parentAgent.path}/${parentAgent.id}`;
    } else {
      // 预设上级为站长
      parentAgent = await this.agentRepository.findOne(
        {
          level: 0,
          parentAgent: null,
        },
        { populate: ['user'] },
      );

      if (!parentAgent) {
        throw new NotFoundException(
          '找不到站长的代理记录。请先为站长创建代理记录。',
        );
      }

      // 站长分配给下级，最大比率 = 100% - 系统费率
      maxAllocatedRate = 100 - config.systemFeeRate;

      level = parentAgent.level + 1;
      path = `${parentAgent.path}/${parentAgent.id}`;
    }

    // 验证分配比率不超过上级的可分配额度
    if (allocatedRate > maxAllocatedRate) {
      throw new BadRequestException(
        `分配比率不能超过 ${maxAllocatedRate}%（上级的可分配额度）`,
      );
    }

    // 创建 TenantUser
    const hashedPassword = await this.passwordService.hashPassword(dto.password);
    const user = this.userRepository.create({
      username: dto.username,
      email: dto.email,
      password: hashedPassword,
      name: dto.name,
      role: UserRole.AGENT,
      status: UserStatus.ACTIVE,
    });

    // 创建 Agent
    const commission: AgentCommission = {
      isEnabled: true,
    };

    const wallet: AgentWallet = {
      address: dto.walletAddress,
      chain: 'tron',
      verified: false,
      totalPaidAmount: 0,
    };

    const agent = this.agentRepository.create({
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

    // 创建 AgentCommissionSetting
    const commissionSetting = this.commissionSettingRepository.create({
      parentAgent: parentAgent.level === 0 ? undefined : parentAgent,  // 站长时 parentAgent 为 null
      childAgent: agent,
      allocatedRate,
    });

    // 更新上级代理的统计
    if (parentAgent) {
      parentAgent.stats.directSubAgents += 1;
      parentAgent.stats.totalSubAgents += 1;
    }

    await this.em.flush();

    this.logger.log(
      `创建代理成功: ${agent.name} (${agent.code}), 分配比率: ${allocatedRate}%`,
    );

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

    // 更新基本信息
    if (dto.name !== undefined) {
      agent.name = dto.name;
      if (agent.user) {
        agent.user.name = dto.name;
      }
    }

    // 更新分配比率
    if (dto.allocatedRate !== undefined) {
      const config = await this.getTenantConfig();

      // 获取上级代理的可分配额度
      let maxAllocatedRate: number;
      if (agent.parentAgent) {
        const parentAllocatedRate = await this.getAgentAllocatedRate(agent.parentAgent.id);
        maxAllocatedRate = parentAllocatedRate;
      } else {
        // 直属站长
        maxAllocatedRate = 100 - config.systemFeeRate;
      }

      if (dto.allocatedRate > maxAllocatedRate) {
        throw new BadRequestException(
          `分配比率不能超过 ${maxAllocatedRate}%（上级的可分配额度）`,
        );
      }

      // 检查是否有下级代理，确保新比率不低于下级的比率
      const subAgentSettings = await this.commissionSettingRepository.find({
        parentAgent: agentId,
      });

      for (const subSetting of subAgentSettings) {
        if (dto.allocatedRate < Number(subSetting.allocatedRate)) {
          throw new BadRequestException(
            `分配比率不能低于下级代理的比率 ${subSetting.allocatedRate}%`,
          );
        }
      }

      // 更新 AgentCommissionSetting
      const setting = await this.commissionSettingRepository.findOne({
        childAgent: agentId,
      });

      if (setting) {
        setting.allocatedRate = dto.allocatedRate;
      }
    }

    // 更新钱包地址
    if (dto.walletAddress !== undefined) {
      if (!agent.wallet) {
        agent.wallet = {
          address: dto.walletAddress,
          chain: 'tron',
          verified: false,
          totalPaidAmount: 0,
        };
      } else {
        if (agent.wallet.address !== dto.walletAddress) {
          agent.wallet.address = dto.walletAddress;
          agent.wallet.verified = false;
          agent.wallet.verifiedAt = undefined;
          agent.wallet.verificationTxHash = undefined;
        }
      }
    }

    // 更新状态
    if (dto.isActive !== undefined) {
      agent.status = dto.isActive ? AgentStatus.ACTIVE : AgentStatus.INACTIVE;
      if (agent.user) {
        agent.user.status = dto.isActive ? UserStatus.ACTIVE : UserStatus.INACTIVE;
      }
    }

    // 更新备注
    if (dto.notes !== undefined) {
      agent.notes = dto.notes;
    }

    await this.em.flush();

    return agent;
  }

  /**
   * 删除代理（软删除）
   */
  async deleteAgent(agentId: number): Promise<void> {
    const agent = await this.agentRepository.findOne(
      { id: agentId },
      { populate: ['user'] },
    );

    if (!agent) {
      throw new NotFoundException('代理不存在');
    }

    // 检查是否有下级代理
    const subAgents = await this.agentRepository.find({ parentAgent: agentId });

    if (subAgents.length > 0) {
      throw new BadRequestException(
        '无法删除该代理，因为存在下级代理。请先处理下级代理。',
      );
    }

    // 软删除：停用代理和用户
    agent.status = AgentStatus.INACTIVE;
    if (agent.user) {
      agent.user.status = UserStatus.INACTIVE;
    }

    // 更新上级代理的统计
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
   * 生成唯一的代理码
   */
  private async generateUniqueAgentCode(): Promise<string> {
    let code: string;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 100;

    while (!isUnique && attempts < maxAttempts) {
      const randomNum = Math.floor(Math.random() * 1000000);
      code = `AG${randomNum.toString().padStart(6, '0')}`;

      const existing = await this.agentRepository.findOne({ code });

      if (!existing) {
        isUnique = true;
      }

      attempts++;
    }

    if (!isUnique) {
      throw new Error('无法生成唯一的代理码，请手动指定');
    }

    return code!;
  }
}
