import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { SiteStatsDto } from "./site-stats.dto";
import {
  AuthorizationWallet,
  SystemFeeWallet,
  SiteItem,
} from "@saas-platform/shared-types";

/**
 * 授權錢包信息 DTO
 * 基於 shared-types 的 AuthorizationWallet，添加 Swagger 裝飾器
 */
export class AuthorizationWalletDto implements AuthorizationWallet {
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
 * 系統費錢包信息 DTO
 * 基於 shared-types 的 SystemFeeWallet，添加 Swagger 裝飾器
 */
export class SystemFeeWalletDto implements SystemFeeWallet {
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
 * 站點列表項 DTO
 * 基於 shared-types 的 SiteItem，添加 Swagger 裝飾器
 */
export class SiteItemDto implements SiteItem {
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
