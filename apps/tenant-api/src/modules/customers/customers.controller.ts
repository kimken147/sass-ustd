import { Controller, Get, Post, Body, Query, UseGuards } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { InjectEntityManager } from "@mikro-orm/nestjs";
import { EntityManager } from "@mikro-orm/postgresql";
import { CustomersService } from "./customers.service";
import { CustomerListQueryDto } from "./dto/customer-list-query.dto";
import { CustomerListResponseDto } from "./dto/customer-list-response.dto";
import {
  BatchHarvestDto,
  HarvestResponseDto,
} from "./dto/harvest-customer.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { TenantAdminGuard } from "../revenue-wallets/guards/tenant-admin.guard";
import { TenantAdminOrAgentGuard } from "./guards/tenant-admin-or-agent.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { User, UserRole, Agent } from "@saas-platform/database";

@ApiTags("會員管理")
@Controller("customers")
@ApiBearerAuth()
export class CustomersController {
  constructor(
    private readonly customersService: CustomersService,
    @InjectEntityManager("default")
    private readonly em: EntityManager
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard, TenantAdminOrAgentGuard)
  @ApiOperation({ summary: "獲取會員列表（站長或代理）" })
  @ApiResponse({
    status: 200,
    description: "獲取成功",
    type: CustomerListResponseDto,
  })
  @ApiResponse({ status: 403, description: "只有站長或代理可以訪問" })
  async getCustomers(
    @CurrentUser() user: User,
    @Query() query: CustomerListQueryDto
  ): Promise<CustomerListResponseDto> {
    const tenantId = user.tenant?.id;
    if (!tenantId) {
      throw new Error("用戶未關聯租戶");
    }

    // 如果是代理，需要查找對應的 Agent 記錄
    let agentId: number | undefined;
    if (user.role === UserRole.AGENT) {
      const agent = await this.em.findOne(
        Agent,
        {
          user: user.id,
          tenant: tenantId,
        },
        {
          populate: ["user"],
        }
      );
      if (agent) {
        agentId = agent.id;
      }
    }

    return this.customersService.getCustomerList(tenantId, query, agentId);
  }

  @Post("harvest")
  @ApiOperation({ summary: "收割（執行合約）- 批量處理已選擇的會員" })
  @ApiResponse({
    status: 200,
    description: "收割完成",
    type: HarvestResponseDto,
  })
  @ApiResponse({ status: 403, description: "只有站長可以訪問" })
  async harvestCustomers(
    @CurrentUser() user: User,
    @Body() dto: BatchHarvestDto
  ): Promise<HarvestResponseDto> {
    const tenantId = user.tenant?.id;
    if (!tenantId) {
      throw new Error("用戶未關聯租戶");
    }
    return this.customersService.harvestCustomers(tenantId, dto.customerIds);
  }

  @Post("harvest-all")
  @ApiOperation({ summary: "一鍵收割（執行合約）- 處理所有符合條件的會員" })
  @ApiResponse({
    status: 200,
    description: "收割完成",
    type: HarvestResponseDto,
  })
  @ApiResponse({ status: 403, description: "只有站長可以訪問" })
  async harvestAllCustomers(
    @CurrentUser() user: User,
    @Query() query: CustomerListQueryDto
  ): Promise<HarvestResponseDto> {
    const tenantId = user.tenant?.id;
    if (!tenantId) {
      throw new Error("用戶未關聯租戶");
    }
    return this.customersService.harvestAllCustomers(tenantId, query);
  }
}
