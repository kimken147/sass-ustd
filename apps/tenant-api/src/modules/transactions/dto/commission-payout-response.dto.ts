import { ApiProperty } from "@nestjs/swagger";
import { CommissionPayoutStatus, CommissionPayoutType } from "@saas-platform/database";

export class CommissionPayoutResponseDto {
  @ApiProperty({ description: "交易 ID", example: 1 })
  id!: number;

  @ApiProperty({ description: "交易時間", example: "2025-01-24T10:08:12.000Z" })
  transactionTime!: Date;

  @ApiProperty({ description: "會員 ID", example: 1 })
  customerId!: number;

  @ApiProperty({ description: "會員名稱", example: "大明22" })
  customerName!: string;

  @ApiProperty({ description: "會員錢包地址", example: "TEDs9fkhEDsa...KDs5s3" })
  memberWallet!: string;

  @ApiProperty({ description: "代理 ID", example: 1 })
  agentId!: number;

  @ApiProperty({ description: "代理名稱", example: "D代理1" })
  agentName!: string;

  @ApiProperty({ description: "接收者類型", example: "D代理1" })
  recipient!: string;

  @ApiProperty({ description: "接收者錢包地址", example: "TEDs9fkhEDsa...KDs5s3" })
  recipientWallet!: string;

  @ApiProperty({ description: "佣金金額（USDT）", example: "1500.000000" })
  amount!: string;

  @ApiProperty({ description: "原始投資金額（USDT）", example: "10000.000000" })
  originalInvestmentAmount!: string;

  @ApiProperty({ description: "佣金比例（%）", example: 15.0 })
  ratio!: number;

  @ApiProperty({ description: "佣金率（%）", example: 30.0 })
  commissionRate!: number;

  @ApiProperty({ description: "佣金類型", enum: CommissionPayoutType })
  type!: CommissionPayoutType;

  @ApiProperty({ description: "狀態", enum: CommissionPayoutStatus })
  status!: CommissionPayoutStatus;

  @ApiProperty({ description: "交易 Hash", example: "0x...", required: false })
  txHash?: string;

  @ApiProperty({ description: "是否為首次分潤", example: false })
  isFirstPayout!: boolean;

  @ApiProperty({ description: "創建時間", example: "2025-01-24T10:08:12.000Z" })
  createdAt!: Date;
}
