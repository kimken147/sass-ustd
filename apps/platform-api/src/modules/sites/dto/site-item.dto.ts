import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { SiteStatsDto } from "./site-stats.dto";
import { SystemWalletAssignment } from "@saas-platform/database";

/**
 * 授權錢包信息（執行合約錢包）
 * 從系統錢包表中查詢，類型為 CONTRACT_EXECUTION
 */
export class AuthorizationWalletDto {
  @ApiProperty({
    description: "錢包標籤（系統錢包名稱）",
    example: "授權用1",
  })
  label!: string;

  @ApiProperty({
    description: "錢包地址（系統錢包地址）",
    example: "TKd7786zhEd65as5JD68s3dH8f5dD",
  })
  address!: string;
}

/**
 * 系統費錢包信息（分潤錢包）
 * 從租戶的 systemWallets 中獲取，類型為 REVENUE_DISTRIBUTION
 */
export class SystemFeeWalletDto {
  @ApiProperty({
    description: "錢包標籤（系統錢包名稱）",
    example: "收系統費用1",
  })
  label!: string;

  @ApiProperty({
    description: "錢包地址（系統錢包地址）",
    example: "TKd7786zhEd65as5JD68s3dH8f5dD",
  })
  address!: string;

  @ApiProperty({
    description: "分配比例（%）",
    example: 40,
  })
  percentage!: number;
}

/**
 * 站點列表項
 */
export class SiteItemDto {
  @ApiProperty({ description: "站點 ID" })
  id!: number;

  @ApiProperty({ description: "站點名稱", example: "各站名稱1XXX" })
  name!: string;

  @ApiProperty({ description: "站點 slug", example: "site-1" })
  slug!: string;

  @ApiPropertyOptional({ description: "自訂域名", example: "api.test.com" })
  customDomain?: string;

  @ApiProperty({ description: "站點費率（%）", example: 10 })
  siteRate!: number;

  @ApiProperty({ description: "授權錢包", type: AuthorizationWalletDto })
  authorizationWallet!: AuthorizationWalletDto;

  @ApiProperty({
    description: "系統費錢包列表",
    type: [SystemFeeWalletDto],
  })
  systemFeeWallets!: SystemFeeWalletDto[];

  @ApiProperty({ description: "站點統計數據", type: SiteStatsDto })
  stats!: SiteStatsDto;
}
