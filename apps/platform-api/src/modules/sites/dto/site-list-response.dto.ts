import { ApiProperty } from "@nestjs/swagger";
import { SiteItemDto } from "./site-item.dto";
import { SiteStatsDto } from "./site-stats.dto";

/**
 * 站點列表響應
 */
export class SiteListResponseDto {
  @ApiProperty({ description: "總體統計數據", type: SiteStatsDto })
  totalStats!: SiteStatsDto;

  @ApiProperty({ description: "站點列表", type: [SiteItemDto] })
  sites!: SiteItemDto[];

  @ApiProperty({ description: "總數", example: 10 })
  total!: number;

  @ApiProperty({ description: "當前頁碼", example: 1 })
  page!: number;

  @ApiProperty({ description: "每頁數量", example: 10 })
  limit!: number;

  @ApiProperty({ description: "總頁數", example: 1 })
  totalPages!: number;
}
