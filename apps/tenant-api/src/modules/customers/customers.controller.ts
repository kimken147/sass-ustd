import { Controller, Get, Post, Body, Query, UseGuards } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { CustomersService } from "./customers.service";
import { CustomerListQueryDto } from "./dto/customer-list-query.dto";
import { CustomerListResponseDto } from "./dto/customer-list-response.dto";
import {
  BatchHarvestDto,
  HarvestResponseDto,
} from "./dto/harvest-customer.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { TenantAdminGuard } from "../revenue-wallets/guards/tenant-admin.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { User } from "@saas-platform/database";

@ApiTags("會員管理")
@Controller("customers")
@UseGuards(JwtAuthGuard, TenantAdminGuard)
@ApiBearerAuth()
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @ApiOperation({ summary: "獲取會員列表" })
  @ApiResponse({
    status: 200,
    description: "獲取成功",
    type: CustomerListResponseDto,
  })
  @ApiResponse({ status: 403, description: "只有站長可以訪問" })
  async getCustomers(
    @CurrentUser() user: User,
    @Query() query: CustomerListQueryDto
  ): Promise<CustomerListResponseDto> {
    const tenantId = user.tenant?.id;
    if (!tenantId) {
      throw new Error("用戶未關聯租戶");
    }
    return this.customersService.getCustomerList(tenantId, query);
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
