import { ApiProperty } from '@nestjs/swagger';
import { Agent, AgentStatus, AgentCommission, AgentWallet, AgentStats } from '@saas-platform/database';

export class AgentResponseDto {
  @ApiProperty({
    description: '代理 ID',
    example: 1,
  })
  id!: number;

  @ApiProperty({
    description: '用戶 ID',
    example: 1,
  })
  userId!: number;

  @ApiProperty({
    description: '登入帳號（username）',
    example: 'agent001',
  })
  username!: string;

  @ApiProperty({
    description: '代理名稱',
    example: '張三',
  })
  name!: string;

  @ApiProperty({
    description: '代理商代碼（邀請碼）',
    example: 'AGENT001',
  })
  code!: string;

  @ApiProperty({
    description: '代理推薦連結',
    example: 'https://example.com/register?ref=AGENT001',
  })
  referralLink!: string;

  @ApiProperty({
    description: '上級代理 ID',
    example: null,
    required: false,
  })
  parentAgentId?: number;

  @ApiProperty({
    description: '代理路徑',
    example: 'root/1',
  })
  path!: string;

  @ApiProperty({
    description: '代理層級',
    example: 1,
  })
  level!: number;

  @ApiProperty({
    description: '分潤錢包',
    required: false,
  })
  wallet?: AgentWallet;

  @ApiProperty({
    description: '佣金設置',
  })
  commission!: AgentCommission;

  @ApiProperty({
    description: '分配的全局比率 (%)，相對於總投資金額',
    example: 70,
    required: false,
  })
  allocatedRate?: number;

  @ApiProperty({
    description: '狀態',
    enum: AgentStatus,
    example: AgentStatus.ACTIVE,
  })
  status!: AgentStatus;

  @ApiProperty({
    description: '統計數據',
  })
  stats!: AgentStats;

  @ApiProperty({
    description: '備註',
    example: '重要代理',
    required: false,
  })
  notes?: string;

  @ApiProperty({
    description: '創建時間',
    example: '2024-01-01T00:00:00Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: '更新時間',
    example: '2024-01-01T00:00:00Z',
  })
  updatedAt!: Date;
}
