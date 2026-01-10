import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { CustomerItem, RecentHarvestInfo } from "@saas-platform/shared-types";

/**
 * 最近收割資訊 DTO
 */
export class RecentHarvestInfoDto implements RecentHarvestInfo {
  @ApiProperty({ description: "最近收割數量", example: 10000.0 })
  amount!: number;

  @ApiPropertyOptional({ description: "最近收割時間", example: "2025-11-24T10:08:12Z" })
  harvestTime?: Date;
}

/**
 * 會員資訊 DTO
 */
export class CustomerResponseDto implements CustomerItem {
  @ApiProperty({ description: "會員 ID", example: 1 })
  id!: number;

  @ApiProperty({ description: "會員錢包地址", example: "TQn9Y2khEsLJKcbLSE" })
  walletAddress!: string;

  @ApiPropertyOptional({ description: "站長備註", example: "重要客戶" })
  notes?: string;

  @ApiPropertyOptional({ description: "授權時間", example: "2025-11-25T10:06:20Z" })
  authorizationTime?: Date;

  @ApiProperty({
    description: "授權狀態",
    enum: ["authorized", "unauthorized", "expired"],
    example: "authorized",
  })
  authorizationStatus!: "authorized" | "unauthorized" | "expired";

  @ApiProperty({ description: "當前數量", example: 2000.0 })
  currentAmount!: number;

  @ApiPropertyOptional({
    description: "最近收割資訊",
    type: RecentHarvestInfoDto,
  })
  recentHarvest?: RecentHarvestInfoDto;
}
