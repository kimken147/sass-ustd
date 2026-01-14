import { Entity, Property, ManyToOne, Enum, Index, Unique } from '@mikro-orm/core';
import { BaseEntity } from './base.entity';
import { TenantUser } from './user-tenant.entity';

export enum AgentStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

export interface AgentCommission {
  baseRate: number;      // 基礎佣金率 (%)，相對於投資金額（實際使用 tenant.cryptoConfig.agentCommissionRate）
  selfRate: number;      // 自己保留的比率 (%)，相對於收到的佣金
  uplineRate: number;    // 給上級的比率 (%)，selfRate + uplineRate = 100
  isEnabled: boolean;
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
  // 客戶統計
  totalCustomers: number;
  activeCustomers: number;
  
  // 下級代理統計
  totalSubAgents: number;
  directSubAgents: number;     // 直接下級數量
  
  // 投資統計
  totalInvestmentVolume: number;
  thisMonthVolume: number;
  
  // 佣金統計
  totalCommissionEarned: number;      // 累計總佣金
  selfCommissionEarned: number;       // 自己保留的佣金
  uplineCommissionPassed: number;     // 傳給上級的佣金
  pendingCommission: number;          // 待發放佣金
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

  // 🔑 核心：佣金設置（向上分潤）
  // 頂級代理（租戶）: selfRate = 100, uplineRate = 0
  // 一般代理: selfRate + uplineRate = 100
  @Property({ type: 'json' })
  commission: AgentCommission = {
    baseRate: 30.0,  // 從 tenant.cryptoConfig.agentCommissionRate 獲取
    selfRate: 60,
    uplineRate: 40,
    isEnabled: true,
  };

  @Enum(() => AgentStatus)
  @Index()
  status: AgentStatus = AgentStatus.ACTIVE;

  // 統計數據
  @Property({ type: 'json' })
  stats: AgentStats = {
    totalCustomers: 0,
    activeCustomers: 0,
    totalSubAgents: 0,
    directSubAgents: 0,
    totalInvestmentVolume: 0,
    thisMonthVolume: 0,
    totalCommissionEarned: 0,
    selfCommissionEarned: 0,
    uplineCommissionPassed: 0,
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
