import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  Tenant,
  TenantPlan,
  TenantStatus,
  TenantBranding,
  TenantCryptoConfig,
  RevenueWallet,
  SystemWalletAssignment,
} from "@saas-platform/database";

export class TenantResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  email!: string;

  @ApiPropertyOptional()
  customUrl?: string;

  @ApiPropertyOptional()
  customDomain?: string;

  @ApiPropertyOptional({ type: Object, additionalProperties: true })
  branding?: TenantBranding;

  @ApiProperty({ enum: TenantStatus })
  status!: TenantStatus;

  @ApiProperty({ enum: TenantPlan })
  plan!: TenantPlan;

  @ApiPropertyOptional()
  trialEndsAt?: Date;

  @ApiProperty({ type: "array" })
  revenueWallets!: RevenueWallet[];

  @ApiProperty()
  systemFeeRate!: number;

  @ApiPropertyOptional({ type: "array" })
  systemWallets?: SystemWalletAssignment[];

  @ApiProperty({ type: Object, additionalProperties: true })
  cryptoConfig!: TenantCryptoConfig;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  static fromEntity(tenant: Tenant): TenantResponseDto {
    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      email: tenant.email,
      customUrl: tenant.customUrl,
      customDomain: tenant.customDomain,
      branding: tenant.branding,
      status: tenant.status,
      plan: tenant.plan,
      trialEndsAt: tenant.trialEndsAt,
      revenueWallets: tenant.revenueWallets,
      systemFeeRate: tenant.systemFeeRate,
      systemWallets: tenant.systemWallets,
      cryptoConfig: tenant.cryptoConfig,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
    };
  }
}
