import { ApiProperty } from "@nestjs/swagger";
import { RevenueDistributionStatus, WalletDistribution } from "@saas-platform/database";

export class RevenueDistributionItemDto {
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

  @ApiProperty({ description: "收款錢包 ID", example: "uuid-123" })
  walletId!: string;

  @ApiProperty({ description: "收款錢包名稱", example: "E收款1" })
  recipient!: string;

  @ApiProperty({ description: "收款錢包地址", example: "TEDs9fkhEDsa...KDs5s3" })
  recipientWallet!: string;

  @ApiProperty({ description: "分配金額（USDT）", example: "3000.000000" })
  amount!: string;

  @ApiProperty({ description: "原始投資金額（USDT）", example: "10000.000000" })
  originalAmount!: string;

  @ApiProperty({ description: "分配比例（%）", example: 30.0 })
  ratio!: number;

  @ApiProperty({ description: "租戶收入比例（%）", example: 60.0 })
  revenueRate!: number;

  @ApiProperty({ description: "狀態", example: "completed" })
  status!: string;

  @ApiProperty({ description: "交易 Hash", example: "0x...", required: false })
  txHash?: string;

  @ApiProperty({ description: "是否為首次分潤", example: false })
  isFirstPayout!: boolean;

  @ApiProperty({ description: "創建時間", example: "2025-01-24T10:08:12.000Z" })
  createdAt!: Date;
}

export class RevenueDistributionResponseDto {
  @ApiProperty({ description: "總筆數", example: 100 })
  total!: number;

  @ApiProperty({ description: "當前頁碼", example: 1 })
  page!: number;

  @ApiProperty({ description: "每頁筆數", example: 20 })
  limit!: number;

  @ApiProperty({ description: "總頁數", example: 5 })
  totalPages!: number;

  @ApiProperty({
    description: "交易明細列表",
    type: [RevenueDistributionItemDto],
  })
  data!: RevenueDistributionItemDto[];
}
