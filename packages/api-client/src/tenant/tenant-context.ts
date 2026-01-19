export interface TenantInfo {
  slug: string;
  name: string;
  branding?: {
    logo?: string;
    primaryColor?: string;
  };
}

class TenantContextClass {
  private tenantInfo: TenantInfo | null = null;
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  async init(platformApiUrl: string): Promise<TenantInfo> {
    if (this.initialized && this.tenantInfo) {
      return this.tenantInfo;
    }

    if (this.initPromise) {
      await this.initPromise;
      return this.tenantInfo!;
    }

    this.initPromise = this.doInit(platformApiUrl);
    await this.initPromise;
    return this.tenantInfo!;
  }

  private async doInit(platformApiUrl: string): Promise<void> {
    const domain = window.location.hostname;

    try {
      const response = await fetch(
        `${platformApiUrl}/api/tenants/by-domain/${encodeURIComponent(domain)}`
      );

      if (!response.ok) {
        throw new Error(`Failed to identify tenant for domain: ${domain}`);
      }

      const result = await response.json();
      const data = result.data || result;

      this.tenantInfo = {
        slug: data.slug,
        name: data.name,
        branding: data.branding,
      };
      this.initialized = true;
    } catch (error) {
      this.initPromise = null;
      throw error;
    }
  }

  getSlug(): string {
    if (!this.tenantInfo) {
      throw new Error('TenantContext not initialized. Call init() first.');
    }
    return this.tenantInfo.slug;
  }

  getInfo(): TenantInfo | null {
    return this.tenantInfo;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  // 用於測試或特殊情況：手動設定租戶
  setTenant(info: TenantInfo): void {
    this.tenantInfo = info;
    this.initialized = true;
  }

  reset(): void {
    this.tenantInfo = null;
    this.initialized = false;
    this.initPromise = null;
  }
}

export const TenantContext = new TenantContextClass();
