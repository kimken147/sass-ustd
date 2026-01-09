import {
  IsString,
  IsNumber,
  Min,
  Matches,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class ProcessInvestmentDto {
  @ApiProperty({
    description: "會員錢包地址（TRON）",
    example: "TXxx...",
  })
  @IsString({ message: "錢包地址必須是字串" })
  @Matches(/^T[A-Za-z1-9]{33}$/, {
    message: "無效的 TRON 地址格式（應為 T 開頭，34 個字符）",
  })
  walletAddress!: string;

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
