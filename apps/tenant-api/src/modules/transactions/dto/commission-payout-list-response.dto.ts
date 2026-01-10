import { ApiProperty } from "@nestjs/swagger";
import { CommissionPayoutResponseDto } from "./commission-payout-response.dto";

export class CommissionPayoutListResponseDto {
  @ApiProperty({ description: "總筆數", example: 100 })
  total!: number;

  @ApiProperty({ description: "當前頁碼", example: 1 })
  page!: number;

  @ApiProperty({ description: "每頁筆數", example: 20 })
  limit!: number;

  @ApiProperty({ description: "總頁數", example: 5 })
  totalPages!: number;

  @ApiProperty({
    description: "代理佣金分配列表",
    type: [CommissionPayoutResponseDto],
  })
  data!: CommissionPayoutResponseDto[];
}
