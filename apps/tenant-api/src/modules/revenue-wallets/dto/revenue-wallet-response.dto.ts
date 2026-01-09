import { ApiProperty } from '@nestjs/swagger';
import { RevenueWallet } from '@saas-platform/database';

export class RevenueWalletResponseDto implements RevenueWallet {
  @ApiProperty({
    description: '錢包 ID（UUID）',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id!: string;

  @ApiProperty({
    description: '錢包名稱',
    example: '營運錢包',
  })
  name!: string;

  @ApiProperty({
    description: 'TRON 錢包地址',
    example: 'TXxx...',
  })
  address!: string;

  @ApiProperty({
    description: '區塊鏈',
    example: 'tron',
    enum: ['tron'],
  })
  chain!: 'tron';

  @ApiProperty({
    description: '分潤比例 (%)',
    example: 60,
  })
  percentage!: number;

  @ApiProperty({
    description: '是否啟用',
    example: true,
  })
  isActive!: boolean;

  @ApiProperty({
    description: '是否已驗證',
    example: false,
  })
  verified!: boolean;

  @ApiProperty({
    description: '驗證時間',
    example: '2024-01-01T00:00:00Z',
    required: false,
  })
  verifiedAt?: Date;

  @ApiProperty({
    description: '驗證交易 hash',
    example: '0x...',
    required: false,
  })
  verificationTxHash?: string;

  @ApiProperty({
    description: '累計已分潤金額',
    example: 0,
  })
  totalPaidAmount!: number;

  @ApiProperty({
    description: '最後分潤時間',
    example: '2024-01-01T00:00:00Z',
    required: false,
  })
  lastPaidAt?: Date;

  @ApiProperty({
    description: '錢包描述',
    example: '主要營運資金',
    required: false,
  })
  description?: string;
}
