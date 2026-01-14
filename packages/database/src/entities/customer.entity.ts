import { Entity, Property, ManyToOne, Enum, Index } from '@mikro-orm/core';
import { BaseEntity } from './base.entity';
import { TenantUser } from './user-tenant.entity';
import { Agent } from './agent.entity';

export enum CustomerStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

// 客戶錢包（用於合約互動）
export interface CustomerWallet {
  address: string; // TRON 地址
  chain: 'tron';
  
  // 合約授權狀態
  isApproved: boolean; // 是否已 approve 合約
  approvedAmount: string; // 授權金額（BigNumber string）
  approvedAt?: Date;
  approvalTxHash?: string; // approve 交易 hash
  
  // 餘額追蹤（可選，也可以從鏈上讀）
  lastBalanceCheck?: Date;
  cachedUsdtBalance?: string; // 快取的 USDT 餘額
}

export interface CustomerInvestmentStats {
  totalInvested: number; // 總投資金額（USDT）
  investmentCount: number; // 投資次數
  firstInvestmentAt?: Date;
  lastInvestmentAt?: Date;
}

/**
 * Customer Entity
 * 
 * 在獨立的 Tenant DB 中，不需要 tenant 關聯
 * 每個租戶資料庫的 customers 表都只屬於該租戶
 */
@Entity({ tableName: 'customers' })
export class Customer extends BaseEntity {
  @ManyToOne(() => TenantUser)
  @Index()
  user!: TenantUser; // 關聯到 TenantUser 表（Tenant DB 專用）

  @ManyToOne(() => Agent, { nullable: true })
  @Index()
  referralAgent?: Agent; // 推薦代理

  @Enum(() => CustomerStatus)
  @Index()
  status: CustomerStatus = CustomerStatus.ACTIVE;

  // 🔑 核心：客戶錢包（用於合約授權）
  @Property({ type: 'json', nullable: true })
  wallet?: CustomerWallet;

  // 投資統計
  @Property({ type: 'json' })
  investmentStats: CustomerInvestmentStats = {
    totalInvested: 0,
    investmentCount: 0,
  };

  @Property({ nullable: true, type: 'text' })
  notes?: string;
}
