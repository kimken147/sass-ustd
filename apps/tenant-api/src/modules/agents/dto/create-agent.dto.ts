import {
  IsString,
  IsNumber,
  IsOptional,
  IsEmail,
  MinLength,
  Matches,
  Min,
  Max,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateAgentDto {
  @ApiProperty({
    description: "代理名稱",
    example: "張三",
  })
  @IsString({ message: "代理名稱必須是字串" })
  name!: string;

  @ApiProperty({
    description: "登入帳號（username）",
    example: "agent001",
  })
  @IsString({ message: "帳號必須是字串" })
  @MinLength(3, { message: "帳號長度至少為 3 個字元" })
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: "帳號只能包含英文字母、數字和底線",
  })
  username!: string;

  @ApiProperty({
    description: "Email",
    example: "agent@example.com",
    required: false,
  })
  @IsEmail({}, { message: "無效的 Email 格式" })
  @IsOptional()
  email?: string;

  @ApiProperty({
    description: "密碼",
    example: "SecurePassword123!",
    minLength: 6,
  })
  @IsString()
  @MinLength(6, { message: "密碼長度至少為 6 個字元" })
  password!: string;

  @ApiProperty({
    description: "上級代理 ID（不提供則預設上級為站長）",
    example: 1,
    required: false,
  })
  @IsNumber({}, { message: "上級代理 ID 必須是數字" })
  @IsOptional()
  parentAgentId?: number;

  @ApiProperty({
    description: "分配给该代理的全局比率 (%)，相对于总投资金额",
    example: 70,
    minimum: 0,
    maximum: 100,
  })
  @IsNumber({}, { message: "分配比率必须是数字" })
  @Min(0, { message: "分配比率不能小于 0" })
  @Max(100, { message: "分配比率不能大于 100" })
  allocatedRate!: number;

  @ApiProperty({
    description: "TRON 錢包地址",
    example: "TXxx...",
  })
  @IsString({ message: "錢包地址必須是字串" })
  @Matches(/^T[A-Za-z1-9]{33}$/, {
    message: "無效的 TRON 地址格式（應為 T 開頭，34 個字符）",
  })
  walletAddress!: string;

  @ApiProperty({
    description: "備註",
    example: "重要代理",
    required: false,
  })
  @IsString({ message: "備註必須是字串" })
  @IsOptional()
  notes?: string;
}
