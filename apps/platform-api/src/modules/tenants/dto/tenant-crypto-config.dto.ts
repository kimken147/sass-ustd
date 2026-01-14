import {
  IsArray,
  IsString,
  IsNumber,
  IsOptional,
  ArrayMinSize,
  Min,
  Max,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";

export class TenantCryptoConfigDto {
  @ApiPropertyOptional({
    description: "支援的區塊鏈",
    example: ["tron"],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  supportedChains?: string[];

  @ApiPropertyOptional({
    description: "支援的代幣",
    example: ["USDT", "TRX"],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  supportedTokens?: string[];

  @ApiPropertyOptional({
    description: "投資合約地址",
    example: "",
  })
  @IsOptional()
  @IsString()
  investmentContractAddress?: string;

  @ApiPropertyOptional({
    description: "USDT Token 地址",
    example: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
  })
  @IsOptional()
  @IsString()
  usdtTokenAddress?: string;

  @ApiPropertyOptional({
    description: "執行合約的錢包 ID（引用 SystemWallet，類型為 CONTRACT_EXECUTION）",
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  executionWalletId?: number;

  @ApiPropertyOptional({
    description: "執行合約的錢包地址（從 SystemWallet 複製，供 tenant-api 使用）",
  })
  @IsOptional()
  @IsString()
  executionWalletAddress?: string;

  @ApiPropertyOptional({
    description: "執行合約的錢包私鑰（從 SystemWallet 複製，已加密，供 tenant-api 使用）",
  })
  @IsOptional()
  @IsString()
  executionWalletPrivateKey?: string;

  @ApiPropertyOptional({
    description: "最小投資金額",
    example: 100,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  minInvestment?: number;

  @ApiPropertyOptional({
    description: "最大投資金額",
    example: 100000,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  maxInvestment?: number;

  @ApiPropertyOptional({
    description: "租戶收入比例 (%)",
    example: 60.0,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(100)
  tenantRevenueRate?: number;

  @ApiPropertyOptional({
    description: "代理佣金總比例 (%)",
    example: 30.0,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(100)
  agentCommissionRate?: number;
}
