import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@mikro-orm/nestjs";
import { EntityRepository } from "@mikro-orm/postgresql";
import { RevenueDistribution, CommissionPayout } from "@saas-platform/database";
import { QueryTransactionsDto } from "./dto/query-transactions.dto";
import { CommissionPayoutListResponseDto } from "./dto/commission-payout-list-response.dto";
import { RevenueDistributionResponseDto } from "./dto/revenue-distribution-response.dto";

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(RevenueDistribution)
    private readonly revenueDistributionRepository: EntityRepository<RevenueDistribution>,
    @InjectRepository(CommissionPayout)
    private readonly commissionPayoutRepository: EntityRepository<CommissionPayout>
  ) {}

  /**
   * 獲取代理佣金分配列表
   */
  async getCommissionPayouts(
    tenantId: number,
    query: QueryTransactionsDto
  ): Promise<CommissionPayoutListResponseDto> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    // 處理預設 startDate（當天 00:00）
    let startDate = query.startDate;
    if (!startDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      startDate = today.toISOString();
    }

    // 構建查詢條件
    const where: any = { tenant: tenantId };

    if (startDate || query.endDate) {
      const dateFilter: any = {};
      if (startDate) {
        dateFilter.$gte = new Date(startDate);
      }
      if (query.endDate) {
        // 結束日期應該包含當天的最後一刻
        const endDate = new Date(query.endDate);
        endDate.setHours(23, 59, 59, 999);
        dateFilter.$lte = endDate;
      }
      if (Object.keys(dateFilter).length > 0) {
        where.createdAt = dateFilter;
      }
    }

    // 查詢總數
    const total = await this.commissionPayoutRepository.count(where);

    // 查詢列表（包含關聯數據）
    const payouts = await this.commissionPayoutRepository.find(where, {
      populate: ["customer", "customer.user", "agent", "agent.user"],
      orderBy: { createdAt: "DESC" },
      limit,
      offset,
    });

    // 轉換為響應格式
    const data = payouts.map((payout) => ({
      id: payout.id,
      transactionTime: payout.createdAt,
      customerId: payout.customer.id,
      customerName: payout.customer.user.name,
      memberWallet: payout.customer.wallet?.address || "",
      agentId: payout.agent.id,
      agentName: payout.agent.user.name,
      recipient: `D代理${payout.agent.id} ${payout.agent.user.name}`,
      recipientWallet: payout.agent.wallet?.address || "",
      amount: payout.amount,
      originalInvestmentAmount: payout.originalInvestmentAmount,
      ratio:
        (parseFloat(payout.amount) /
          parseFloat(payout.originalInvestmentAmount)) *
        100,
      commissionRate: payout.commissionRate,
      type: payout.type,
      status: payout.status,
      txHash: payout.txHash,
      isFirstPayout: payout.isFirstPayout,
      createdAt: payout.createdAt,
    }));

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 獲取租戶收入分配列表
   */
  async getRevenueDistributions(
    tenantId: number,
    query: QueryTransactionsDto
  ): Promise<RevenueDistributionResponseDto> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    // 處理預設 startDate（當天 00:00）
    let startDate = query.startDate;
    if (!startDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      startDate = today.toISOString();
    }

    // 構建查詢條件
    const where: any = { tenant: tenantId };

    if (startDate || query.endDate) {
      const dateFilter: any = {};
      if (startDate) {
        dateFilter.$gte = new Date(startDate);
      }
      if (query.endDate) {
        // 結束日期應該包含當天的最後一刻
        const endDate = new Date(query.endDate);
        endDate.setHours(23, 59, 59, 999);
        dateFilter.$lte = endDate;
      }
      if (Object.keys(dateFilter).length > 0) {
        where.createdAt = dateFilter;
      }
    }

    // 查詢所有符合條件的 distributions（用於展開和計算總數）
    const allDistributions = await this.revenueDistributionRepository.find(
      where,
      {
        populate: ["customer", "customer.user"],
        orderBy: { createdAt: "DESC" },
      }
    );

    // 計算總數（展開所有 walletDistributions）
    const totalItems = allDistributions.reduce(
      (sum, dist) => sum + dist.walletDistributions.length,
      0
    );

    // 展開 walletDistributions 為單獨的項目
    const allItems: any[] = [];
    for (const distribution of allDistributions) {
      for (const walletDist of distribution.walletDistributions) {
        allItems.push({
          id: distribution.id,
          transactionTime: distribution.createdAt,
          customerId: distribution.customer.id,
          customerName: distribution.customer.user.name,
          memberWallet: distribution.customer.wallet?.address || "",
          walletId: walletDist.walletId,
          recipient: `E收款${walletDist.walletId.slice(-4)} ${walletDist.walletName}`,
          recipientWallet: walletDist.walletAddress,
          amount: walletDist.amount,
          originalAmount: distribution.originalAmount,
          ratio: walletDist.percentage,
          revenueRate: distribution.revenueRate,
          status: walletDist.status,
          txHash: walletDist.txHash,
          isFirstPayout: walletDist.isFirstPayout || false,
          createdAt: distribution.createdAt,
        });
      }
    }

    // 按時間排序（降序）
    allItems.sort(
      (a, b) => b.transactionTime.getTime() - a.transactionTime.getTime()
    );

    // 分頁處理
    const paginatedItems = allItems.slice(offset, offset + limit);

    return {
      data: paginatedItems,
      total: totalItems,
      page,
      limit,
      totalPages: Math.ceil(totalItems / limit),
    };
  }
}
