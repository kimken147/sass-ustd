import { Injectable, Logger } from "@nestjs/common";
import { TenantDbConnectionService } from "./tenant-db-connection.service";
import { SiteStatsDto } from "../dto/site-stats.dto";
import { SiteListQueryDto } from "../dto/site-list-query.dto";
import { TimeType } from "@saas-platform/shared-types";

/**
 * 站點統計服務
 * 負責從各個租戶資料庫中聚合統計數據
 */
@Injectable()
export class SiteStatsService {
  private readonly logger = new Logger(SiteStatsService.name);

  constructor(
    private readonly tenantDbConnection: TenantDbConnectionService
  ) {}

  /**
   * 獲取站點統計數據
   * @param tenantSlug 租戶 slug
   * @param query 查詢條件
   * @returns 統計數據
   */
  async getSiteStats(
    tenantSlug: string,
    query: SiteListQueryDto
  ): Promise<SiteStatsDto> {
    try {
      const params: any[] = [];
      let paramIndex = 1;

      // 構建時間條件（根據時間類型選擇不同的時間欄位）
      const isHarvestTime = query.timeType === TimeType.HARVEST_TIME;
      
      // 授權時間條件（用於 customers 表）
      let customerTimeCondition = "";
      let customerTimeParams: any[] = [];
      let customerParamIndex = 1;
      
      if (query.startTime || query.endTime) {
        if (!isHarvestTime) {
          // 授權時間：使用 wallet->>'approvedAt'
          const conditions: string[] = [];
          if (query.startTime) {
            conditions.push(`(c.wallet->>'approvedAt')::timestamptz >= $${customerParamIndex}`);
            customerTimeParams.push(query.startTime);
            customerParamIndex++;
          }
          if (query.endTime) {
            conditions.push(`(c.wallet->>'approvedAt')::timestamptz <= $${customerParamIndex}`);
            customerTimeParams.push(query.endTime);
            customerParamIndex++;
          }
          if (conditions.length > 0) {
            customerTimeCondition = `WHERE ${conditions.join(" AND ")}`;
            params.push(...customerTimeParams);
            paramIndex += customerTimeParams.length;
          }
        }
      }

      // 收割時間條件（用於分潤記錄表）
      let distributionTimeCondition = "";
      let distributionTimeParams: any[] = [];
      let distributionParamIndex = paramIndex;
      
      if (query.startTime || query.endTime) {
        if (isHarvestTime) {
          const conditions: string[] = [];
          if (query.startTime) {
            conditions.push(`created_at >= $${distributionParamIndex}`);
            distributionTimeParams.push(query.startTime);
            distributionParamIndex++;
          }
          if (query.endTime) {
            conditions.push(`created_at <= $${distributionParamIndex}`);
            distributionTimeParams.push(query.endTime);
            distributionParamIndex++;
          }
          if (conditions.length > 0) {
            distributionTimeCondition = `WHERE ${conditions.join(" AND ")}`;
            params.push(...distributionTimeParams);
            paramIndex = distributionParamIndex;
          }
        }
      }

      // 構建授權狀態條件
      let authCondition = "";
      if (query.authorizationStatus === "authorized") {
        authCondition = customerTimeCondition
          ? `AND (c.wallet->>'isApproved')::boolean = true`
          : `WHERE (c.wallet->>'isApproved')::boolean = true`;
      } else if (query.authorizationStatus === "unauthorized") {
        authCondition = customerTimeCondition
          ? `AND ((c.wallet->>'isApproved')::boolean = false OR c.wallet IS NULL)`
          : `WHERE ((c.wallet->>'isApproved')::boolean = false OR c.wallet IS NULL)`;
      }

      // 查詢授權客戶數量
      const authorizedClientsQuery = `
        SELECT COUNT(DISTINCT c.id) as count
        FROM customers c
        ${customerTimeCondition} ${authCondition}
        AND c.deleted_at IS NULL
      `;

      // 查詢總投資數量（從客戶投資統計中聚合）
      const totalQuantityQuery = `
        SELECT COALESCE(SUM((c.investment_stats->>'totalInvested')::numeric), 0) as total
        FROM customers c
        ${customerTimeCondition} ${authCondition}
        AND c.deleted_at IS NULL
      `;

      // 查詢收割數量（從客戶投資統計中聚合，或從分潤記錄中聚合）
      let harvestQuantityQuery: string;
      if (isHarvestTime) {
        // 從分潤記錄中聚合（收割時間）
        harvestQuantityQuery = `
          SELECT COALESCE(SUM((rd.total_amount)::numeric), 0) as total
          FROM revenue_distributions rd
          ${distributionTimeCondition}
          AND rd.deleted_at IS NULL
        `;
      } else {
        // 從客戶統計中聚合（授權時間）
        harvestQuantityQuery = `
          SELECT COALESCE(SUM((c.investment_stats->>'totalWithdrawn')::numeric), 0) as total
          FROM customers c
          ${customerTimeCondition} ${authCondition}
          AND c.deleted_at IS NULL
        `;
      }

      // 查詢利潤（從客戶投資統計中聚合）
      const profitQuery = `
        SELECT COALESCE(SUM((c.investment_stats->>'totalProfit')::numeric), 0) as total
        FROM customers c
        ${customerTimeCondition} ${authCondition}
        AND c.deleted_at IS NULL
      `;

      // 查詢商戶代理統計（從代理佣金記錄中聚合）
      let merchantAgentQuery: string;
      if (isHarvestTime) {
        merchantAgentQuery = `
          SELECT COALESCE(SUM((cp.amount)::numeric), 0) as total
          FROM commission_payouts cp
          ${distributionTimeCondition}
          AND cp.deleted_at IS NULL
        `;
      } else {
        // 授權時間：使用客戶創建時間作為代理關聯時間
        merchantAgentQuery = `
          SELECT COALESCE(SUM((cp.amount)::numeric), 0) as total
          FROM commission_payouts cp
          INNER JOIN customers c ON cp.customer_id = c.id
          ${customerTimeCondition.replace(/c\.wallet/g, "c.wallet")}
          AND cp.deleted_at IS NULL
          AND c.deleted_at IS NULL
        `;
      }

      // 查詢系統費用（從系統費分潤記錄中聚合）
      let systemFeeQuery: string;
      if (isHarvestTime) {
        systemFeeQuery = `
          SELECT COALESCE(SUM((sfd.amount)::numeric), 0) as total
          FROM system_fee_distributions sfd
          ${distributionTimeCondition}
          AND sfd.deleted_at IS NULL
        `;
      } else {
        // 授權時間：使用客戶創建時間作為系統費關聯時間
        systemFeeQuery = `
          SELECT COALESCE(SUM((sfd.amount)::numeric), 0) as total
          FROM system_fee_distributions sfd
          INNER JOIN customers c ON sfd.customer_id = c.id
          ${customerTimeCondition.replace(/c\.wallet/g, "c.wallet")}
          AND sfd.deleted_at IS NULL
          AND c.deleted_at IS NULL
        `;
      }

      // 並行執行所有查詢
      const [
        authorizedClientsResult,
        totalQuantityResult,
        harvestQuantityResult,
        profitResult,
        merchantAgentResult,
        systemFeeResult,
      ] = await Promise.all([
        this.tenantDbConnection.query(tenantSlug, authorizedClientsQuery, params),
        this.tenantDbConnection.query(tenantSlug, totalQuantityQuery, params),
        this.tenantDbConnection.query(tenantSlug, harvestQuantityQuery, params),
        this.tenantDbConnection.query(tenantSlug, profitQuery, params),
        this.tenantDbConnection.query(tenantSlug, merchantAgentQuery, params),
        this.tenantDbConnection.query(tenantSlug, systemFeeQuery, params),
      ]);

      return {
        authorizedClients: parseInt(
          authorizedClientsResult[0]?.count || "0",
          10
        ),
        totalQuantity: parseFloat(
          totalQuantityResult[0]?.total || "0"
        ),
        harvestQuantity: parseFloat(
          harvestQuantityResult[0]?.total || "0"
        ),
        profit: parseFloat(profitResult[0]?.total || "0"),
        merchantAgent: parseFloat(merchantAgentResult[0]?.total || "0"),
        systemFee: parseFloat(systemFeeResult[0]?.total || "0"),
      };
    } catch (error) {
      this.logger.error(
        `獲取站點統計數據失敗: tenant_${tenantSlug}, 錯誤: ${error.message}`
      );
      // 如果資料庫不存在或查詢失敗，返回默認值
      return {
        authorizedClients: 0,
        totalQuantity: 0,
        harvestQuantity: 0,
        profit: 0,
        merchantAgent: 0,
        systemFee: 0,
      };
    }
  }

  /**
   * 獲取總體統計數據（所有站點的聚合）
   * @param tenantSlugs 所有租戶 slug 列表
   * @param query 查詢條件
   * @returns 總體統計數據
   */
  async getTotalStats(
    tenantSlugs: string[],
    query: SiteListQueryDto
  ): Promise<SiteStatsDto> {
    // 並行獲取所有站點的統計數據
    const statsPromises = tenantSlugs.map((slug) =>
      this.getSiteStats(slug, query)
    );
    const allStats = await Promise.all(statsPromises);

    // 聚合所有統計數據
    return allStats.reduce(
      (total, stats) => ({
        authorizedClients: total.authorizedClients + stats.authorizedClients,
        totalQuantity: total.totalQuantity + stats.totalQuantity,
        harvestQuantity: total.harvestQuantity + stats.harvestQuantity,
        profit: total.profit + stats.profit,
        merchantAgent: total.merchantAgent + stats.merchantAgent,
        systemFee: total.systemFee + stats.systemFee,
      }),
      {
        authorizedClients: 0,
        totalQuantity: 0,
        harvestQuantity: 0,
        profit: 0,
        merchantAgent: 0,
        systemFee: 0,
      }
    );
  }
}
