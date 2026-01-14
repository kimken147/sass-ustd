import { Entity, Property, ManyToOne, Enum, Index } from '@mikro-orm/core';
import { BaseEntity } from './base.entity';
import { Customer } from './customer.entity';

export enum RevenueDistributionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

// 單個錢包的分配記錄
export interface WalletDistribution {
  walletId: string;
  walletName: string;
  walletAddress: string;
  percentage: number;
  amount: string; // BigNumber string
  txHash?: string;
  status: 'pending' | 'completed' | 'failed';
  completedAt?: Date;
  error?: string;
  isFirstPayout?: boolean; // 是否為首次分潤（用於驗證）
}

/**
 * RevenueDistribution Entity
 * 
 * 在獨立的 Tenant DB 中，不需要 tenant 關聯
 * 每個租戶資料庫的 revenue_distributions 表都只屬於該租戶
 */
@Entity({ tableName: 'revenue_distributions' })
export class RevenueDistribution extends BaseEntity {
  @ManyToOne(() => Customer)
  @Index()
  customer!: Customer; // 來源客戶

  // 總金額
  @Property({ type: 'decimal', precision: 20, scale: 6 })
  totalAmount!: string; // 總分潤金額（租戶收入）

  @Property({ type: 'decimal', precision: 20, scale: 6 })
  originalAmount!: string; // 原始投資金額

  @Property({ type: 'decimal', precision: 5, scale: 2 })
  revenueRate!: number; // 租戶收入比例

  // 🔑 分潤錢包資訊（snapshot - 記錄當下的配置）
  @Property({ type: 'json' })
  walletDistributions!: WalletDistribution[];

  // 整體狀態
  @Enum(() => RevenueDistributionStatus)
  @Index()
  status: RevenueDistributionStatus = RevenueDistributionStatus.PENDING;

  @Property({ nullable: true })
  processedAt?: Date;

  @Property({ nullable: true })
  completedAt?: Date;

  @Property({ nullable: true, type: 'text' })
  notes?: string;
}
