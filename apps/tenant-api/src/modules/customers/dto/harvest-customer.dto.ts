import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsNumber, ArrayMinSize } from "class-validator";

/**
 * 提幣單個會員 DTO
 */
export class HarvestCustomerDto {
  @ApiProperty({
    description: "會員 ID",
    example: 1,
  })
  @IsNumber()
  customerId!: number;
}

/**
 * 批量提幣 DTO
 */
export class BatchHarvestDto {
  @ApiProperty({
    description: "會員 ID 列表",
    example: [1, 2, 3],
    type: [Number],
  })
  @IsArray()
  @IsNumber({}, { each: true })
  @ArrayMinSize(1, { message: "至少需要選擇一個會員" })
  customerIds!: number[];
}

/**
 * 提幣結果
 */
export class HarvestResultDto {
  @ApiProperty({ description: "會員 ID" })
  customerId!: number;

  @ApiProperty({ description: "是否成功" })
  success!: boolean;

  @ApiProperty({ description: "投資金額", required: false })
  amount?: number;

  @ApiProperty({ description: "錯誤訊息", required: false })
  error?: string;
}

/**
 * 提幣響應 DTO
 */
export class HarvestResponseDto {
  @ApiProperty({ description: "成功數量" })
  successCount!: number;

  @ApiProperty({ description: "失敗數量" })
  failureCount!: number;

  @ApiProperty({ description: "提幣結果列表", type: [HarvestResultDto] })
  results!: HarvestResultDto[];
}
