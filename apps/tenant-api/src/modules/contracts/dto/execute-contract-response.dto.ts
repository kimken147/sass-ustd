import { ApiProperty } from "@nestjs/swagger";
import { Customer, CustomerStatus } from "@saas-platform/database";

export class ExecuteContractResponseDto {
  @ApiProperty({
    description: "會員 ID",
    example: 1,
  })
  customerId!: number;

  @ApiProperty({
    description: "用戶 ID",
    example: 1,
  })
  userId!: number;

  @ApiProperty({
    description: "會員名稱",
    example: "張三",
  })
  name!: string;

  @ApiProperty({
    description: "會員錢包地址",
    example: "TXxx...",
  })
  walletAddress!: string;

  @ApiProperty({
    description: "推薦代理 ID",
    example: 1,
    required: false,
  })
  referralAgentId?: number;

  @ApiProperty({
    description: "推薦代理代碼",
    example: "AG000123",
    required: false,
  })
  referralAgentCode?: string;

  @ApiProperty({
    description: "會員狀態",
    enum: CustomerStatus,
    example: CustomerStatus.ACTIVE,
  })
  status!: CustomerStatus;

  @ApiProperty({
    description: "是否為新創建的會員",
    example: true,
  })
  isNewCustomer!: boolean;
}
