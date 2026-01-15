export interface TenantConfig {
  investmentContractAddress: string;
  usdtTokenAddress: string;
  branding?: {
    logo?: string;
    primaryColor?: string;
    secondaryColor?: string;
  };
}

export interface TenantInfo {
  slug: string;
  name: string;
  config: TenantConfig;
}

export interface TenantPageProps {
  tenantConfig: TenantConfig;
}
