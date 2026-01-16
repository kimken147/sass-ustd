import { Entity, Property, ManyToOne, Index, Unique } from '@mikro-orm/core';
import { BaseEntity } from './base.entity';
import { Agent } from './agent.entity';

/**
 * AgentCommissionSetting Entity
 *
 * 记录代理之间的分润比率分配关系
 * - parent_agent_id = NULL 代表站长分配给直属代理
 * - 每条代理线独立，同一个上级可以给不同下级分配不同比率
 * - allocated_rate 是全局比率（相对于总投资金额的百分比）
 */
@Entity({ tableName: 'agent_commission_settings' })
@Unique({ properties: ['parentAgent', 'childAgent'] })
export class AgentCommissionSetting extends BaseEntity {
  // 上级代理，NULL = 站长
  @ManyToOne(() => Agent, { nullable: true })
  @Index()
  parentAgent?: Agent;

  // 下级代理
  @ManyToOne(() => Agent)
  @Index()
  childAgent!: Agent;

  // 分配的全局比率 (0-100)，相对于总投资金额
  @Property({ type: 'decimal', precision: 5, scale: 2 })
  allocatedRate!: number;
}
