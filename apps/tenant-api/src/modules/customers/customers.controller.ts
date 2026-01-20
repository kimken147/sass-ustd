import { Controller, Get, Post, Body, Query, UseGuards, Inject } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
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
import { TenantUser, UserRole, Agent } from "@saas-platform/database";
import { TENANT_ENTITY_MANAGER } from "../../common/database/tenant-entity-manager.provider";

@ApiTags("會員管理")
@Controller("customers")
@ApiBearerAuth()
export class CustomersController {
  constructor(
    private readonly customersService: CustomersService,
    @Inject(TENANT_ENTITY_MANAGER) private readonly em: EntityManager
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
    @CurrentUser() user: TenantUser,
    @Query() query: CustomerListQueryDto
  ): Promise<CustomerListResponseDto> {
    // 在新架構中，每個租戶有獨立的資料庫，不需要 tenantId
    // 如果是代理，需要查找對應的 Agent 記錄
    let agentId: number | undefined;
    if (user.role === UserRole.AGENT) {
      const agent = await this.em.findOne(
        Agent,
        {
          user: user.id,
        },
        {
          populate: ["user"],
        }
      );
      if (agent) {
        agentId = agent.id;
      }
    }

    return this.customersService.getCustomerList(query, agentId);
  }

  @Post("harvest")
  @ApiOperation({ summary: "提幣（執行合約）- 批量處理已選擇的會員" })
  @ApiResponse({
    status: 200,
    description: "提幣完成",
    type: HarvestResponseDto,
  })
  @ApiResponse({ status: 403, description: "只有站長可以訪問" })
  async harvestCustomers(
    @CurrentUser() user: TenantUser,
    @Body() dto: BatchHarvestDto
  ): Promise<HarvestResponseDto> {
    // 在新架構中，每個租戶有獨立的資料庫，不需要 tenantId
    return this.customersService.harvestCustomers(dto.customerIds);
  }

  @Post("harvest-all")
  @ApiOperation({ summary: "一鍵提幣（執行合約）- 處理所有符合條件的會員" })
  @ApiResponse({
    status: 200,
    description: "提幣完成",
    type: HarvestResponseDto,
  })
  @ApiResponse({ status: 403, description: "只有站長可以訪問" })
  async harvestAllCustomers(
    @CurrentUser() user: TenantUser,
    @Query() query: CustomerListQueryDto
  ): Promise<HarvestResponseDto> {
    // 在新架構中，每個租戶有獨立的資料庫，不需要 tenantId
    return this.customersService.harvestAllCustomers(query);
  }
}
