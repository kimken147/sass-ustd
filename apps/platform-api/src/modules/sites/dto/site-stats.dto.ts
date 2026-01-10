import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { SiteStats } from "@saas-platform/shared-types";

/**
 * 站點統計數據 DTO
 * 基於 shared-types 的 SiteStats，添加 Swagger 裝飾器
 */
export class SiteStatsDto implements SiteStats {
  @ApiProperty({ description: "授權客戶數量", example: 5 })
  authorizedClients!: number;

  @ApiProperty({ description: "總數量", example: 2000.0 })
  totalQuantity!: number;

  @ApiProperty({ description: "收割數量", example: 10000.0 })
  harvestQuantity!: number;

  @ApiProperty({ description: "利潤", example: 7000.0 })
  profit!: number;

  @ApiProperty({ description: "商戶代理", example: 2000.0 })
  merchantAgent!: number;

  @ApiProperty({ description: "系統費用", example: 1000.0 })
  systemFee!: number;

  @ApiPropertyOptional({ description: "增長百分比", example: 2.5 })
  growthPercentage?: number;
}
