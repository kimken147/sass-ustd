import { Controller, Get, Query } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { TransactionsService } from "./transactions.service";
import { QueryTransactionsDto } from "./dto/query-transactions.dto";
import { CommissionPayoutListResponseDto } from "./dto/commission-payout-list-response.dto";
import { RevenueDistributionResponseDto } from "./dto/revenue-distribution-response.dto";
import { Public } from "../auth/decorators/public.decorator";

@ApiTags("交易明細")
@Controller("transactions")
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get("commission-payouts")
  @Public()
  @ApiOperation({ summary: "獲取代理佣金分配列表" })
  @ApiResponse({
    status: 200,
    description: "獲取成功",
    type: CommissionPayoutListResponseDto,
  })
  async getCommissionPayouts(
    @Query() query: QueryTransactionsDto
  ): Promise<CommissionPayoutListResponseDto> {
    return this.transactionsService.getCommissionPayouts(query);
  }

  @Get("revenue-distributions")
  @Public()
  @ApiOperation({ summary: "獲取租戶收入分配列表" })
  @ApiResponse({
    status: 200,
    description: "獲取成功",
    type: RevenueDistributionResponseDto,
  })
  async getRevenueDistributions(
    @Query() query: QueryTransactionsDto
  ): Promise<RevenueDistributionResponseDto> {
    return this.transactionsService.getRevenueDistributions(query);
  }
}
