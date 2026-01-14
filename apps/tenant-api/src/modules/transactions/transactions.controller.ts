import {
  Controller,
  Get,
  Query,
  Headers,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
} from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";
import { TransactionsService } from "./transactions.service";
import { QueryTransactionsDto } from "./dto/query-transactions.dto";
import { CommissionPayoutListResponseDto } from "./dto/commission-payout-list-response.dto";
import { RevenueDistributionResponseDto } from "./dto/revenue-distribution-response.dto";
import { Public } from "../auth/decorators/public.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { TenantUser } from "@saas-platform/database";

@ApiTags("交易明細")
@Controller("transactions")
export class TransactionsController {
  constructor(
    private readonly transactionsService: TransactionsService,
    private readonly configService: ConfigService
  ) {}

  @Get("commission-payouts")
  @Public()
  @ApiOperation({ summary: "獲取代理佣金分配列表" })
  @ApiHeader({
    name: "X-Tenant-Id",
    description: "租戶 ID（可選，如果未提供則從環境變數獲取）",
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: "獲取成功",
    type: CommissionPayoutListResponseDto,
  })
  async getCommissionPayouts(
    @Query() query: QueryTransactionsDto,
    @CurrentUser() user?: TenantUser,
    @Headers("x-tenant-id") tenantIdHeader?: string
  ): Promise<CommissionPayoutListResponseDto> {
    const tenantId =
      user?.tenant?.id ||
      (tenantIdHeader ? parseInt(tenantIdHeader) : undefined) ||
      parseInt(this.configService.get<string>("TENANT_ID") || "1");
    return this.transactionsService.getCommissionPayouts(tenantId, query);
  }

  @Get("revenue-distributions")
  @Public()
  @ApiOperation({ summary: "獲取租戶收入分配列表" })
  @ApiHeader({
    name: "X-Tenant-Id",
    description: "租戶 ID（可選，如果未提供則從環境變數獲取）",
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: "獲取成功",
    type: RevenueDistributionResponseDto,
  })
  async getRevenueDistributions(
    @Query() query: QueryTransactionsDto,
    @CurrentUser() user?: TenantUser,
    @Headers("x-tenant-id") tenantIdHeader?: string
  ): Promise<RevenueDistributionResponseDto> {
    const tenantId =
      user?.tenant?.id ||
      (tenantIdHeader ? parseInt(tenantIdHeader) : undefined) ||
      parseInt(this.configService.get<string>("TENANT_ID") || "1");
    return this.transactionsService.getRevenueDistributions(tenantId, query);
  }
}
