import { Injectable, Logger, Inject } from "@nestjs/common";
import { EntityManager } from "@mikro-orm/postgresql";
import {
  Customer,
  RevenueDistribution,
  CommissionPayout,
  SystemFeeDistribution,
  Agent,
} from "@saas-platform/database";
import { CustomerListQueryDto } from "./dto/customer-list-query.dto";
import { CustomerListResponseDto } from "./dto/customer-list-response.dto";
import { CustomerResponseDto } from "./dto/customer-response.dto";
import { CustomerStatsDto } from "./dto/customer-stats.dto";
import { HarvestResponseDto, HarvestResultDto } from "./dto/harvest-customer.dto";
import {
  CustomerAuthorizationStatus as SharedCustomerAuthorizationStatus,
  TimeType as SharedTimeType,
} from "@saas-platform/shared-types";
import { ContractsService } from "../contracts/contracts.service";
import { TENANT_ENTITY_MANAGER } from "../../common/database";

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  constructor(
    @Inject(TENANT_ENTITY_MANAGER)
    private readonly em: EntityManager,
    private readonly contractsService: ContractsService
  ) {}

  /**
   * 獲取會員列表
   * @param query 查詢條件
   * @param agentId 可選的代理 ID（如果提供，則只查詢該代理旗下的會員）
   */
  async getCustomerList(
    query: CustomerListQueryDto,
    agentId?: number
  ): Promise<CustomerListResponseDto> {
    // 構建查詢條件
    const where: any = {
      deletedAt: null, // 只查詢未刪除的
    };

    // 如果提供了 agentId，則只查詢該代理旗下的會員
    if (agentId) {
      where.referralAgent = agentId;
    }

    // 授權狀態篩選
    if (query.authorizationStatus && query.authorizationStatus !== SharedCustomerAuthorizationStatus.ALL) {
      // 需要通過 JSON 欄位查詢 wallet.isApproved
      // 這裡先查詢所有，然後在應用層過濾
    }

    // 地址模糊查詢（使用原生 SQL 查詢 JSON 欄位）
    // 注意：MikroORM 對 JSON 欄位的查詢支持有限，這裡先查詢所有，然後在應用層過濾

    // 時間範圍篩選（根據時間類型）
    const isHarvestTime = query.timeType === SharedTimeType.HARVEST_TIME;

    // 先查詢所有符合基本條件的會員
    let customers = await this.em.find(Customer, where, {
      populate: ["user", "referralAgent"],
      orderBy: { createdAt: "DESC" },
    });

    // 如果提供了 agentId，確保只返回該代理旗下的會員
    if (agentId) {
      customers = customers.filter((c) => c.referralAgent?.id === agentId);
    }

    // 應用授權狀態篩選和地址篩選
    if (
      (query.authorizationStatus && query.authorizationStatus !== SharedCustomerAuthorizationStatus.ALL) ||
      query.address
    ) {
      customers = customers.filter((customer) => {
        const wallet = customer.wallet;

        // 地址篩選
        if (query.address) {
          const address = wallet?.address || "";
          if (!address.toLowerCase().includes(query.address.toLowerCase())) {
            return false;
          }
        }

        // 授權狀態篩選
        if (query.authorizationStatus && query.authorizationStatus !== SharedCustomerAuthorizationStatus.ALL) {
          if (!wallet) {
            return query.authorizationStatus === SharedCustomerAuthorizationStatus.UNAUTHORIZED;
          }

          const isApproved = wallet.isApproved;
          const approvedAt = wallet.approvedAt;

          switch (query.authorizationStatus) {
            case SharedCustomerAuthorizationStatus.AUTHORIZED:
              return isApproved && approvedAt != null;
            case SharedCustomerAuthorizationStatus.UNAUTHORIZED:
              return !isApproved || approvedAt == null;
            case SharedCustomerAuthorizationStatus.EXPIRED:
              // 已失效：需要根據業務邏輯判斷（例如授權過期）
              // 這裡暫時返回 false，需要根據實際業務邏輯實現
              return false;
            default:
              return true;
          }
        }

        return true;
      });
    }

    // 應用時間範圍篩選
    if (query.startDate || query.endDate) {
      const startDate = query.startDate ? new Date(query.startDate) : null;
      const endDate = query.endDate ? new Date(query.endDate) : null;

      if (isHarvestTime) {
        // 提幣時間：需要從 RevenueDistribution 查詢
        // 先獲取在時間範圍內有提幣記錄的會員 ID
        const harvestWhere: any = {
          deletedAt: null,
        };
        if (startDate) {
          harvestWhere.createdAt = { $gte: startDate };
        }
        if (endDate) {
          harvestWhere.createdAt = { ...harvestWhere.createdAt, $lte: endDate };
        }

        const harvests = await this.em.find(RevenueDistribution, harvestWhere, {
          fields: ["customer"],
        });
        const customerIds = new Set(harvests.map((h) => h.customer.id));
        customers = customers.filter((c) => customerIds.has(c.id));
      } else {
        // 授權時間：使用 wallet.approvedAt
        customers = customers.filter((customer) => {
          const approvedAt = customer.wallet?.approvedAt;
          if (!approvedAt) return false;

          if (startDate && approvedAt < startDate) return false;
          if (endDate && approvedAt > endDate) return false;
          return true;
        });
      }
    }

    // 獲取每個會員的最近提幣資訊
    const customerIds = customers.map((c) => c.id);
    const recentHarvests = await this.getRecentHarvests(customerIds);

    // 轉換為 DTO
    const customerDtos: CustomerResponseDto[] = customers.map((customer) => {
      const wallet = customer.wallet;
      const harvest = recentHarvests.get(customer.id);

      // 判斷授權狀態
      let authorizationStatus: "authorized" | "unauthorized" | "expired";
      if (!wallet || !wallet.isApproved || !wallet.approvedAt) {
        authorizationStatus = "unauthorized";
      } else {
        // 授權狀態判斷：已授權
        // 注意：已失效狀態需要通過 Tron API 查詢，由前端觸發檢查
        authorizationStatus = "authorized";
      }

      // 當前數量：優先使用 cachedUsdtBalance，否則使用 investmentStats.totalInvested
      const currentAmount = wallet?.cachedUsdtBalance
        ? parseFloat(wallet.cachedUsdtBalance)
        : customer.investmentStats?.totalInvested || 0;

      return {
        id: customer.id,
        walletAddress: wallet?.address || "",
        notes: customer.notes,
        authorizationTime: wallet?.approvedAt,
        authorizationStatus,
        currentAmount,
        recentHarvest: harvest
          ? {
              amount: parseFloat(harvest.totalAmount),
              harvestTime: harvest.createdAt,
            }
          : undefined,
      };
    });

    // 計算統計數據（如果是代理查詢，需要傳入 agentId）
    const stats = await this.calculateStats(query, customers, agentId);

    // 分頁
    const page = query.page || 1;
    const limit = query.limit || 20;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedCustomers = customerDtos.slice(startIndex, endIndex);
    const totalPages = Math.ceil(customerDtos.length / limit);

    return {
      stats,
      customers: paginatedCustomers,
      total: customerDtos.length,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * 獲取最近提幣資訊
   */
  private async getRecentHarvests(
    customerIds: number[]
  ): Promise<Map<number, RevenueDistribution>> {
    if (customerIds.length === 0) {
      return new Map();
    }

    // 查詢每個會員的最新提幣記錄
    const harvests = await this.em.find(
      RevenueDistribution,
      {
        customer: { $in: customerIds },
        deletedAt: null,
      },
      {
        populate: ["customer"],
        orderBy: { createdAt: "DESC" },
      }
    );

    // 按會員 ID 分組，只保留最新的
    const harvestMap = new Map<number, RevenueDistribution>();
    for (const harvest of harvests) {
      const customerId = harvest.customer.id;
      if (!harvestMap.has(customerId)) {
        harvestMap.set(customerId, harvest);
      }
    }

    return harvestMap;
  }

  /**
   * 計算統計數據
   * @param query 查詢條件
   * @param customers 會員列表
   * @param agentId 可選的代理 ID（如果提供，則只統計該代理旗下的數據）
   */
  private async calculateStats(
    query: CustomerListQueryDto,
    customers: Customer[],
    agentId?: number
  ): Promise<CustomerStatsDto> {
    // 授權客戶數
    const authorizedClients = customers.filter(
      (c) => c.wallet?.isApproved && c.wallet?.approvedAt
    ).length;

    // 總數量（當前餘額總和）
    const totalQuantity = customers.reduce((sum, c) => {
      const amount = c.wallet?.cachedUsdtBalance
        ? parseFloat(c.wallet.cachedUsdtBalance)
        : c.investmentStats?.totalInvested || 0;
      return sum + amount;
    }, 0);

    // 提幣數量（從 RevenueDistribution 聚合）
    const harvestWhere: any = {
      deletedAt: null,
    };

    // 如果提供了 agentId，只統計該代理旗下的會員的提幣記錄
    if (agentId) {
      const customerIds = customers.map((c) => c.id);
      if (customerIds.length > 0) {
        harvestWhere.customer = { $in: customerIds };
      } else {
        // 如果沒有會員，直接返回 0
        harvestWhere.customer = { $in: [] };
      }
    }

    // 如果指定了時間範圍和提幣時間類型，需要加上時間條件
    if (query.timeType === SharedTimeType.HARVEST_TIME) {
      if (query.startDate) {
        harvestWhere.createdAt = { $gte: new Date(query.startDate) };
      }
      if (query.endDate) {
        harvestWhere.createdAt = {
          ...harvestWhere.createdAt,
          $lte: new Date(query.endDate),
        };
      }
    }

    const harvests = await this.em.find(RevenueDistribution, harvestWhere);
    const harvestQuantity = harvests.reduce((sum, h) => {
      return sum + parseFloat(h.totalAmount);
    }, 0);

    // 系統費用（從 SystemFeeDistribution 聚合）
    // 注意：如果是代理查詢，系統費用不應包含在代理的統計中
    const systemFeeWhere: any = {
      deletedAt: null,
    };
    if (query.timeType === SharedTimeType.HARVEST_TIME) {
      if (query.startDate) {
        systemFeeWhere.createdAt = { $gte: new Date(query.startDate) };
      }
      if (query.endDate) {
        systemFeeWhere.createdAt = {
          ...systemFeeWhere.createdAt,
          $lte: new Date(query.endDate),
        };
      }
    }
    const systemFees = await this.em.find(SystemFeeDistribution, systemFeeWhere);
    const systemFee = systemFees.reduce((sum, f) => {
      return sum + parseFloat(f.amount);
    }, 0);

    // 商戶代理（從 CommissionPayout 聚合代理的佣金）
    const commissionWhere: any = {
      deletedAt: null,
    };

    // 如果提供了 agentId，只統計該代理的佣金
    if (agentId) {
      commissionWhere.agent = agentId;
    }
    if (query.timeType === SharedTimeType.HARVEST_TIME) {
      if (query.startDate) {
        commissionWhere.createdAt = { $gte: new Date(query.startDate) };
      }
      if (query.endDate) {
        commissionWhere.createdAt = {
          ...commissionWhere.createdAt,
          $lte: new Date(query.endDate),
        };
      }
    }
    const commissions = await this.em.find(CommissionPayout, commissionWhere);
    const merchantAgent = commissions.reduce((sum, c) => {
      return sum + parseFloat(c.amount);
    }, 0);

    // 利潤 = 提幣數量（租戶收入）
    // 提幣數量是執行合約時的分潤，包括：系統費用、租戶收入、代理佣金
    // 這裡的 harvestQuantity 是租戶收入（RevenueDistribution.totalAmount）
    const profit = harvestQuantity;

    return {
      authorizedClients,
      totalQuantity,
      harvestQuantity,
      profit,
      merchantAgent,
      systemFee,
    };
  }

  /**
   * 提幣會員（執行合約）- 批量處理已選擇的會員
   */
  async harvestCustomers(
    customerIds: number[]
  ): Promise<HarvestResponseDto> {
    const results: HarvestResultDto[] = [];
    let successCount = 0;
    let failureCount = 0;

    // 查詢所有要提幣的會員
    const customers = await this.em.find(
      Customer,
      {
        id: { $in: customerIds },
        deletedAt: null,
      },
      {
        populate: ["user", "referralAgent"],
      }
    );

    // 逐個處理每個會員
    for (const customer of customers) {
      try {
        // 檢查會員是否有錢包和授權
        if (!customer.wallet || !customer.wallet.address) {
          results.push({
            customerId: customer.id,
            success: false,
            error: "會員未設定錢包地址",
          });
          failureCount++;
          continue;
        }

        if (!customer.wallet.isApproved || !customer.wallet.approvedAmount) {
          results.push({
            customerId: customer.id,
            success: false,
            error: "會員尚未授權或授權金額為 0",
          });
          failureCount++;
          continue;
        }

        // 獲取授權金額（-1 表示無限額度，需要查詢實際餘額）
        let harvestAmount = parseFloat(customer.wallet.approvedAmount);

        if (harvestAmount === -1) {
          // 無限授權，查詢實際 USDT 餘額
          try {
            harvestAmount = await this.contractsService.getUSDTBalance(customer.wallet.address);
            this.logger.log(`會員 ${customer.id} 無限授權，實際餘額: ${harvestAmount} USDT`);
          } catch (error) {
            results.push({
              customerId: customer.id,
              success: false,
              error: "無法獲取錢包餘額",
            });
            failureCount++;
            continue;
          }
        }

        if (harvestAmount <= 0) {
          results.push({
            customerId: customer.id,
            success: false,
            error: "授權金額或餘額必須大於 0",
          });
          failureCount++;
          continue;
        }

        // 調用 processInvestment 執行合約（提幣）
        const result = await this.contractsService.processInvestment({
          customerId: customer.id,
          amount: harvestAmount,
        });

        results.push({
          customerId: customer.id,
          success: true,
          amount: result.investmentAmount,
        });
        successCount++;
      } catch (error) {
        this.logger.error(
          `提幣會員 ${customer.id} 失敗: ${error instanceof Error ? error.message : String(error)}`
        );
        results.push({
          customerId: customer.id,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
        failureCount++;
      }
    }

    return {
      successCount,
      failureCount,
      results,
    };
  }

  /**
   * 同步會員錢包餘額（從鏈上查詢並更新 cachedUsdtBalance）
   */
  async syncBalances(
    customerIds: number[]
  ): Promise<{ successCount: number; failureCount: number; results: { customerId: number; balance?: number; error?: string }[] }> {
    const results: { customerId: number; balance?: number; error?: string }[] = [];
    let successCount = 0;
    let failureCount = 0;

    const customers = await this.em.find(Customer, {
      id: { $in: customerIds },
      deletedAt: null,
    });

    for (const customer of customers) {
      try {
        if (!customer.wallet?.address) {
          results.push({ customerId: customer.id, error: "會員未設定錢包地址" });
          failureCount++;
          continue;
        }

        const balance = await this.contractsService.getUSDTBalance(customer.wallet.address);

        // 更新 cachedUsdtBalance
        customer.wallet = {
          ...customer.wallet,
          cachedUsdtBalance: balance.toString(),
          lastBalanceCheck: new Date(),
        };

        results.push({ customerId: customer.id, balance });
        successCount++;
      } catch (error) {
        this.logger.error(
          `同步會員 ${customer.id} 餘額失敗: ${error instanceof Error ? error.message : String(error)}`
        );
        results.push({
          customerId: customer.id,
          error: error instanceof Error ? error.message : String(error),
        });
        failureCount++;
      }
    }

    await this.em.flush();

    return { successCount, failureCount, results };
  }

  /**
   * 一鍵提幣（執行合約）- 處理所有符合條件的會員
   */
  async harvestAllCustomers(
    query: CustomerListQueryDto
  ): Promise<HarvestResponseDto> {
    // 先獲取符合條件的會員列表
    const customerList = await this.getCustomerList(query);

    // 提取所有會員 ID
    const customerIds = customerList.customers.map((c) => c.id);

    if (customerIds.length === 0) {
      return {
        successCount: 0,
        failureCount: 0,
        results: [],
      };
    }

    // 調用批量提幣
    return this.harvestCustomers(customerIds);
  }
}
