import { ApiProperty } from "@nestjs/swagger";
import { CustomerListResponse } from "@saas-platform/shared-types";
import { CustomerStatsDto } from "./customer-stats.dto";
import { CustomerResponseDto } from "./customer-response.dto";

/**
 * 會員列表響應 DTO
 */
export class CustomerListResponseDto implements CustomerListResponse {
  @ApiProperty({ description: "統計數據", type: CustomerStatsDto })
  stats!: CustomerStatsDto;

  @ApiProperty({ description: "會員列表", type: [CustomerResponseDto] })
  customers!: CustomerResponseDto[];

  @ApiProperty({ description: "總數", example: 100 })
  total!: number;

  @ApiProperty({ description: "當前頁碼", example: 1 })
  page!: number;

  @ApiProperty({ description: "每頁數量", example: 20 })
  limit!: number;

  @ApiProperty({ description: "總頁數", example: 5 })
  totalPages!: number;
}
