import { ApiProperty } from "@nestjs/swagger";
import { CustomerStats } from "@saas-platform/shared-types";

/**
 * 會員統計數據 DTO
 */
export class CustomerStatsDto implements CustomerStats {
  @ApiProperty({ description: "授權客戶數量", example: 5 })
  authorizedClients!: number;

  @ApiProperty({ description: "總數量", example: 2000.0 })
  totalQuantity!: number;

  @ApiProperty({ description: "提幣數量", example: 10000.0 })
  harvestQuantity!: number;

  @ApiProperty({ description: "利潤", example: 7000.0 })
  profit!: number;

  @ApiProperty({ description: "商戶代理", example: 2000.0 })
  merchantAgent!: number;

  @ApiProperty({ description: "系統費用", example: 1000.0 })
  systemFee!: number;
}
