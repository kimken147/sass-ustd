import { IsString, IsNumber, Min, IsInt } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class ProcessInvestmentDto {
  @ApiProperty({
    description: "會員 ID（必須是已授權合約的會員）",
    example: 1,
  })
  @IsInt({ message: "會員 ID 必須是整數" })
  @Min(1, { message: "會員 ID 必須大於 0" })
  customerId!: number;

  @ApiProperty({
    description: "投資金額（USDT）",
    example: 1000,
    minimum: 0,
  })
  @IsNumber({}, { message: "投資金額必須是數字" })
  @Min(0, { message: "投資金額不能小於 0" })
  amount!: number;

  @ApiProperty({
    description: "交易 Hash（合約執行交易）",
    example: "0x...",
    required: false,
  })
  @IsString({ message: "交易 Hash 必須是字串" })
  txHash?: string;
}
