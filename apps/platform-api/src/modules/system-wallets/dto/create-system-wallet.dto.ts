import {
  IsString,
  IsEnum,
  IsOptional,
  MinLength,
  MaxLength,
  IsBoolean,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  SystemWalletChain,
  SystemWalletStatus,
  SystemWalletType,
} from "@saas-platform/database";

export class CreateSystemWalletDto {
  @ApiProperty({
    description: "錢包名稱",
    example: "主系統錢包",
  })
  @IsString()
  @MinLength(2, { message: "錢包名稱長度至少為 2 個字元" })
  name!: string;

  @ApiProperty({
    description: "錢包地址",
    example: "TXYZabcdefghijklmnopqrstuvwxyz123456",
  })
  @IsString()
  @MinLength(26, { message: "錢包地址長度至少為 26 個字元" })
  @MaxLength(42, { message: "錢包地址長度最多為 42 個字元" })
  address!: string;

  @ApiProperty({
    description: "錢包類型",
    enum: SystemWalletType,
    example: SystemWalletType.REVENUE_DISTRIBUTION,
  })
  @IsEnum(SystemWalletType)
  type!: SystemWalletType;

  @ApiPropertyOptional({
    description: "區塊鏈",
    enum: SystemWalletChain,
    default: SystemWalletChain.TRON,
  })
  @IsEnum(SystemWalletChain)
  @IsOptional()
  chain?: SystemWalletChain = SystemWalletChain.TRON;

  @ApiPropertyOptional({
    description: "狀態",
    enum: SystemWalletStatus,
    default: SystemWalletStatus.ACTIVE,
  })
  @IsEnum(SystemWalletStatus)
  @IsOptional()
  status?: SystemWalletStatus = SystemWalletStatus.ACTIVE;

  @ApiPropertyOptional({
    description: "備註說明",
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: "私鑰（僅 CONTRACT_EXECUTION 類型需要，將被加密存儲）",
    example: "明文私鑰",
  })
  @IsString()
  @IsOptional()
  privateKey?: string;
}
