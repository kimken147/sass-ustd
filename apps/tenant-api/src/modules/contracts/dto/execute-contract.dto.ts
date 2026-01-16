import {
  IsString,
  IsOptional,
  Matches,
  IsEmail,
  MinLength,
  IsNumber,
  Min,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class ExecuteContractDto {
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
    description: "授權金額（USDT），會員授權給合約的金額。-1 表示無限額度",
    example: 10000,
    minimum: -1,
  })
  @IsNumber({}, { message: "授權金額必須是數字" })
  @Min(-1, { message: "授權金額不能小於 -1（-1 表示無限額度）" })
  approvedAmount!: number;

  @ApiProperty({
    description: "授權交易 Hash（approve 交易）",
    example: "0x...",
    required: false,
  })
  @IsString({ message: "授權交易 Hash 必須是字串" })
  @IsOptional()
  approvalTxHash?: string;

  @ApiProperty({
    description: "代理推薦碼（可選）",
    example: "AG000123",
    required: false,
  })
  @IsString({ message: "代理推薦碼必須是字串" })
  @IsOptional()
  referralCode?: string;

  @ApiProperty({
    description: "會員名稱（如果不存在則創建）",
    example: "張三",
    required: false,
  })
  @IsString({ message: "會員名稱必須是字串" })
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: "Email（如果不存在則創建）",
    example: "customer@example.com",
    required: false,
  })
  @IsEmail({}, { message: "無效的 Email 格式" })
  @IsOptional()
  email?: string;

  @ApiProperty({
    description: "登入帳號（可選，如果提供則使用，否則自動生成）",
    example: "customer001",
    required: false,
  })
  @IsString({ message: "帳號必須是字串" })
  @MinLength(3, { message: "帳號長度至少為 3 個字元" })
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: "帳號只能包含英文字母、數字和底線",
  })
  @IsOptional()
  username?: string;

  @ApiProperty({
    description:
      "密碼（不需要提供，系統會自動生成隨機密碼，因為會員不需要登入）",
    example: "（系統自動生成）",
    required: false,
    deprecated: true,
  })
  @IsString()
  @IsOptional()
  password?: string;
}
