import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@mikro-orm/nestjs";
import { EntityRepository } from "@mikro-orm/postgresql";
import {
  Tenant,
  TenantStatus,
  SystemWallet,
  SystemWalletType,
  SystemWalletStatus,
} from "@saas-platform/database";
import { SiteListQueryDto } from "./dto/site-list-query.dto";
import { SiteListResponseDto } from "./dto/site-list-response.dto";
import { SiteItemDto } from "./dto/site-item.dto";
import { SiteStatsService } from "./services/site-stats.service";

/**
 * 站點列表服務
 */
@Injectable()
export class SitesService {
  private readonly logger = new Logger(SitesService.name);

  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepository: EntityRepository<Tenant>,
    @InjectRepository(SystemWallet)
    private readonly systemWalletRepository: EntityRepository<SystemWallet>,
    private readonly siteStatsService: SiteStatsService
  ) {}

  /**
   * 獲取站點列表
   * @param query 查詢條件
   * @returns 站點列表響應
   */
  async getSiteList(
    query: SiteListQueryDto
  ): Promise<SiteListResponseDto> {
    // 查詢所有活躍的租戶
    const tenants = await this.tenantRepository.find({
      status: { $ne: TenantStatus.INACTIVE },
    });

    // 獲取所有租戶的統計數據
    const tenantSlugs = tenants.map((t) => t.slug);
    const [totalStats, ...siteStatsList] = await Promise.all([
      this.siteStatsService.getTotalStats(tenantSlugs, query),
      ...tenants.map((tenant) =>
        this.siteStatsService.getSiteStats(tenant.slug, query)
      ),
    ]);

    // 查詢所有活躍的授權錢包（執行合約錢包）
    const authorizationWallets = await this.systemWalletRepository.find({
      type: SystemWalletType.CONTRACT_EXECUTION,
      status: SystemWalletStatus.ACTIVE,
    });

    // 構建站點列表項
    const sites: SiteItemDto[] = tenants.map((tenant, index) => {
      const stats = siteStatsList[index];

      // 構建授權錢包信息（從系統錢包表中查詢類型為 CONTRACT_EXECUTION 的錢包）
      // 如果有多個，取第一個；如果沒有，使用默認值
      const authorizationWallet =
        authorizationWallets.length > 0
          ? {
              label: authorizationWallets[0].name,
              address: authorizationWallets[0].address,
            }
          : {
              label: "授權用1",
              address: "",
            };

      // 構建系統費錢包列表（從 tenant.systemWallets 中獲取）
      // 這些是類型為 REVENUE_DISTRIBUTION 的系統錢包，已經指派給租戶
      const systemFeeWallets =
        tenant.systemWallets?.map((sw) => ({
          label: sw.name,
          address: sw.address,
          percentage: sw.percentage,
        })) || [];

      return {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        customDomain: tenant.customDomain,
        siteRate: tenant.systemFeeRate,
        authorizationWallet,
        systemFeeWallets: systemFeeWallets,
        stats,
      };
    });

    // 分頁處理
    const page = query.page || 1;
    const limit = query.limit || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedSites = sites.slice(startIndex, endIndex);
    const totalPages = Math.ceil(sites.length / limit);

    return {
      totalStats,
      sites: paginatedSites,
      total: sites.length,
      page,
      limit,
      totalPages,
    };
  }
}
