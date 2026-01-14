import { Entity, Property, ManyToOne, Enum, Index } from '@mikro-orm/core';
import { BaseEntity } from './base.entity';
import { Customer } from './customer.entity';

export enum SystemFeeDistributionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/**
 * SystemFeeDistribution Entity
 * 
 * 在獨立的 Tenant DB 中，不需要 tenant 關聯
 * 每個租戶資料庫的 system_fee_distributions 表都只屬於該租戶
 */
@Entity({ tableName: 'system_fee_distributions' })
export class SystemFeeDistribution extends BaseEntity {
  @ManyToOne(() => Customer)
  @Index()
  customer!: Customer; // 來源客戶

  // 金額資訊
  @Property({ type: 'decimal', precision: 20, scale: 6 })
  amount!: string; // 系統費金額

  @Property({ type: 'decimal', precision: 20, scale: 6 })
  originalAmount!: string; // 原始投資金額

  @Property({ type: 'decimal', precision: 5, scale: 2 })
  feeRate!: number; // 系統費率（當下的費率）

  // 系統錢包資訊
  @Property()
  systemWalletAddress!: string; // 系統商錢包地址

  @Property({ default: 'tron' })
  chain: string = 'tron';

  // 狀態
  @Enum(() => SystemFeeDistributionStatus)
  @Index()
  status: SystemFeeDistributionStatus = SystemFeeDistributionStatus.PENDING;

  // 交易資訊
  @Property({ nullable: true })
  txHash?: string;

  @Property({ nullable: true })
  txError?: string;

  @Property({ nullable: true })
  processedAt?: Date;

  @Property({ nullable: true })
  completedAt?: Date;

  @Property({ nullable: true, type: 'text' })
  notes?: string;
}
