import { Entity, Property, ManyToOne, Enum, Index } from '@mikro-orm/core';
import { BaseEntity } from './base.entity';
import { Tenant } from './tenant.entity';
import { Agent } from './agent.entity';
import { Customer } from './customer.entity';

export enum CommissionPayoutStatus {
  PENDING = 'pending',       // 待發放
  PROCESSING = 'processing', // 處理中
  COMPLETED = 'completed',   // 已完成
  FAILED = 'failed',         // 失敗
}

export enum CommissionPayoutType {
  SELF = 'self',                   // 自己保留的佣金
  FROM_DOWNLINE = 'from_downline', // 從下級收到的佣金
}

@Entity({ tableName: 'commission_payouts' })
export class CommissionPayout extends BaseEntity {
  @ManyToOne(() => Tenant)
  @Index()
  tenant!: Tenant;

  @ManyToOne(() => Agent)
  @Index()
  agent!: Agent; // 收款代理商

  @ManyToOne(() => Customer)
  @Index()
  customer!: Customer; // 投資客戶

  @ManyToOne(() => Agent, { nullable: true })
  @Index()
  sourceAgent?: Agent; // 佣金來源代理（如果是從下級傳上來的）

  @Enum(() => CommissionPayoutType)
  type!: CommissionPayoutType;

  // 金額資訊
  @Property({ type: 'decimal', precision: 20, scale: 6 })
  amount!: string; // USDT 金額

  @Property({ type: 'decimal', precision: 20, scale: 6 })
  originalInvestmentAmount!: string; // 原始投資金額

  @Property({ type: 'decimal', precision: 5, scale: 2 })
  commissionRate!: number; // 佣金率

  // 如果是向上分潤
  @Property({ type: 'decimal', precision: 20, scale: 6, nullable: true })
  receivedAmount?: string; // 從下級收到的金額

  @Property({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  selfRate?: number; // 保留比率

  @Property({ type: 'decimal', precision: 20, scale: 6, nullable: true })
  passedToUplineAmount?: string; // 傳給上級的金額

  // 錢包資訊
  @Property()
  walletAddress!: string; // 收款錢包地址

  @Property({ default: 'tron' })
  chain: string = 'tron';

  // 狀態
  @Enum(() => CommissionPayoutStatus)
  @Index()
  status: CommissionPayoutStatus = CommissionPayoutStatus.PENDING;

  // 交易資訊
  @Property({ nullable: true })
  txHash?: string; // 交易 hash

  @Property({ nullable: true })
  txError?: string; // 如果失敗，錯誤訊息

  @Property({ nullable: true })
  processedAt?: Date; // 處理時間

  @Property({ nullable: true })
  completedAt?: Date; // 完成時間

  // 🔑 第一次分潤自動驗證
  @Property({ default: false })
  isFirstPayout: boolean = false; // 是否為首次分潤（用於驗證錢包）

  @Property({ nullable: true, type: 'text' })
  notes?: string;
}
