import {
  IsString,
  IsEmail,
  IsEnum,
  IsOptional,
  MinLength,
  Matches,
  ValidateNested,
  IsObject,
  IsArray,
  ArrayMinSize,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  TenantPlan,
  TenantStatus,
  TenantBranding,
  TenantCryptoConfig,
  RevenueWallet,
} from "@saas-platform/database";
import { SystemWalletAssignmentDto } from "./system-wallet-assignment.dto";

export class CreateTenantDto {
  @ApiProperty({
    description: "租戶名稱",
    example: "ABC 投資公司",
  })
  @IsString()
  @MinLength(2, { message: "租戶名稱長度至少為 2 個字元" })
  name!: string;

  @ApiProperty({
    description: "租戶 slug（URL 友好名稱，用於資料庫名稱）",
    example: "abc-investment",
  })
  @IsString()
  @MinLength(3, { message: "Slug 長度至少為 3 個字元" })
  @Matches(/^[a-z0-9-]+$/, {
    message: "Slug 只能包含小寫字母、數字和連字號",
  })
  slug!: string;

  @ApiProperty({
    description: "租戶聯絡電子郵件",
    example: "contact@abc-investment.com",
  })
  @IsEmail({}, { message: "請輸入有效的電子郵件地址" })
  email!: string;

  @ApiPropertyOptional({
    description: "租戶計劃",
    enum: TenantPlan,
    default: TenantPlan.TRIAL,
  })
  @IsEnum(TenantPlan)
  @IsOptional()
  plan?: TenantPlan = TenantPlan.TRIAL;

  @ApiPropertyOptional({
    description: "租戶狀態",
    enum: TenantStatus,
    default: TenantStatus.ACTIVE,
  })
  @IsEnum(TenantStatus)
  @IsOptional()
  status?: TenantStatus = TenantStatus.ACTIVE;

  @ApiPropertyOptional({
    description: "試用結束時間",
    example: "2024-12-31T23:59:59Z",
  })
  @IsOptional()
  trialEndsAt?: Date;

  @ApiPropertyOptional({
    description: "自訂 URL",
    example: "https://abc.yoursaas.com",
  })
  @IsString()
  @IsOptional()
  customUrl?: string;

  @ApiPropertyOptional({
    description: "自訂域名",
    example: "abc-investment.com",
  })
  @IsString()
  @IsOptional()
  customDomain?: string;

  @ApiPropertyOptional({
    description: "白標品牌配置",
    type: Object,
    additionalProperties: true,
  })
  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => Object)
  branding?: TenantBranding;

  @ApiPropertyOptional({
    description: "系統費率（%）",
    example: 10.0,
    default: 10.0,
  })
  @IsOptional()
  systemFeeRate?: number = 10.0;

  @ApiPropertyOptional({
    description: "虛擬貨幣配置",
    type: Object,
    additionalProperties: true,
  })
  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => Object)
  cryptoConfig?: Partial<TenantCryptoConfig>;

  @ApiPropertyOptional({
    description: "租戶分潤錢包組",
    type: "array",
  })
  @IsOptional()
  revenueWallets?: RevenueWallet[];

  @ApiPropertyOptional({
    description: "系統商錢包指派（用於分潤，比例總和必須 = 100%）",
    type: [SystemWalletAssignmentDto],
    example: [
      { walletId: 1, percentage: 60 },
      { walletId: 2, percentage: 40 },
    ],
  })
  @IsOptional()
  @IsArray({ message: "系統錢包指派必須是陣列" })
  @ArrayMinSize(1, { message: "至少需要指派一個系統錢包" })
  @ValidateNested({ each: true })
  @Type(() => SystemWalletAssignmentDto)
  systemWallets?: SystemWalletAssignmentDto[];
}
