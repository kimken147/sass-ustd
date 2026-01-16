import { Entity, Property, ManyToOne, Enum, Index, Unique } from '@mikro-orm/core';
import { BaseEntity } from './base.entity';
import { TenantUser } from './user-tenant.entity';

export enum AgentStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

export interface AgentCommission {
  isEnabled: boolean;    // 是否启用分润
}

export interface AgentWallet {
  address: string;
  chain: 'tron';
  verified: boolean;           // 是否驗證過
  verifiedAt?: Date;           // 驗證時間（第一次收到分潤時）
  verificationTxHash?: string; // 第一次分潤交易 hash
  lastPaidAt?: Date;
  totalPaidAmount: number;     // 累計已分潤金額
}

export interface AgentStats {
  // 客户统计
  totalCustomers: number;
  activeCustomers: number;

  // 下级代理统计
  totalSubAgents: number;
  directSubAgents: number;     // 直接下级数量

  // 投资统计
  totalInvestmentVolume: number;
  thisMonthVolume: number;

  // 佣金统计
  totalCommissionEarned: number;      // 累计总佣金
  pendingCommission: number;          // 待发放佣金
  thisMonthCommission: number;
}

/**
 * Agent Entity
 * 
 * 在獨立的 Tenant DB 中，不需要 tenant 關聯
 * 每個租戶資料庫的 agents 表都只屬於該租戶
 */
@Entity({ tableName: 'agents' })
@Unique({ properties: ['code'] })
export class Agent extends BaseEntity {
  @ManyToOne(() => TenantUser)
  @Index()
  user!: TenantUser; // 關聯到 TenantUser 表（Tenant DB 專用）

  @Property()
  name!: string;

  @Property()
  @Index()
  code!: string; // 代理商代碼（邀請碼）

  // 🔑 無限層級代理結構
  @ManyToOne(() => Agent, { nullable: true })
  @Index()
  parentAgent?: Agent;  // null = 頂級代理（租戶本人）

  @Property({ default: 'root' })
  @Index()
  path: string = 'root'; // 例如: "root/1/5/12"

  @Property({ default: 0 })
  @Index()
  level: number = 0; // 0 = 頂級代理（租戶）, 1 = 二級...

  // 🔑 核心：分潤錢包（第一次分潤時驗證）
  @Property({ type: 'json', nullable: true })
  wallet?: AgentWallet;

  // 佣金设置
  @Property({ type: 'json' })
  commission: AgentCommission = {
    isEnabled: true,
  };

  @Enum(() => AgentStatus)
  @Index()
  status: AgentStatus = AgentStatus.ACTIVE;

  // 统计数据
  @Property({ type: 'json' })
  stats: AgentStats = {
    totalCustomers: 0,
    activeCustomers: 0,
    totalSubAgents: 0,
    directSubAgents: 0,
    totalInvestmentVolume: 0,
    thisMonthVolume: 0,
    totalCommissionEarned: 0,
    pendingCommission: 0,
    thisMonthCommission: 0,
  };

  @Property({ nullable: true, type: 'text' })
  notes?: string;
  
  // 🔑 輔助方法：判斷是否為頂級代理（租戶）
  isTopAgent(): boolean {
    return this.parentAgent === null && this.level === 0;
  }
}
