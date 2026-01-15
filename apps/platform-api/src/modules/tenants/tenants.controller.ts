import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from "@nestjs/swagger";
import { TenantsService } from "./tenants.service";
import { CreateTenantDto } from "./dto/create-tenant.dto";
import { UpdateTenantDto } from "./dto/update-tenant.dto";
import { TenantResponseDto } from "./dto/tenant-response.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { Public } from "../auth/decorators/public.decorator";

@ApiTags("租戶管理")
@Controller("tenants")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "創建新租戶（站台）" })
  @ApiResponse({
    status: 201,
    description: "租戶創建成功",
    type: TenantResponseDto,
  })
  @ApiResponse({ status: 400, description: "請求參數錯誤" })
  @ApiResponse({ status: 409, description: "租戶 slug 或 email 已存在" })
  async create(
    @Body() createTenantDto: CreateTenantDto
  ): Promise<TenantResponseDto> {
    return this.tenantsService.create(createTenantDto);
  }

  @Get()
  @ApiOperation({ summary: "查詢所有租戶" })
  @ApiResponse({
    status: 200,
    description: "查詢成功",
    type: [TenantResponseDto],
  })
  async findAll(): Promise<TenantResponseDto[]> {
    return this.tenantsService.findAll();
  }

  @Get(":id")
  @ApiOperation({ summary: "根據 ID 查詢租戶" })
  @ApiParam({ name: "id", description: "租戶 ID", type: Number })
  @ApiResponse({
    status: 200,
    description: "查詢成功",
    type: TenantResponseDto,
  })
  @ApiResponse({ status: 404, description: "租戶不存在" })
  async findOne(
    @Param("id", ParseIntPipe) id: number
  ): Promise<TenantResponseDto> {
    return this.tenantsService.findOne(id);
  }

  @Get("slug/:slug")
  @ApiOperation({ summary: "根據 slug 查詢租戶" })
  @ApiParam({ name: "slug", description: "租戶 slug", type: String })
  @ApiResponse({
    status: 200,
    description: "查詢成功",
    type: TenantResponseDto,
  })
  @ApiResponse({ status: 404, description: "租戶不存在" })
  async findBySlug(@Param("slug") slug: string): Promise<TenantResponseDto> {
    return this.tenantsService.findBySlug(slug);
  }

  @Get("by-domain/:domain")
  @ApiOperation({ summary: "Get tenant by custom domain" })
  @ApiParam({
    name: "domain",
    description: "Tenant custom domain",
    type: String,
    example: "tenant-a.example.com",
  })
  @ApiResponse({
    status: 200,
    description: "Tenant found",
    type: TenantResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: "Tenant not found",
  })
  @Public()
  async findByDomain(
    @Param("domain") domain: string,
  ): Promise<TenantResponseDto> {
    return this.tenantsService.findByCustomDomain(domain);
  }

  @Patch(":id")
  @ApiOperation({ summary: "更新租戶" })
  @ApiParam({ name: "id", description: "租戶 ID", type: Number })
  @ApiResponse({
    status: 200,
    description: "更新成功",
    type: TenantResponseDto,
  })
  @ApiResponse({ status: 404, description: "租戶不存在" })
  @ApiResponse({ status: 409, description: "slug 或 email 衝突" })
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateTenantDto: UpdateTenantDto
  ): Promise<TenantResponseDto> {
    return this.tenantsService.update(id, updateTenantDto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "刪除租戶（軟刪除）" })
  @ApiParam({ name: "id", description: "租戶 ID", type: Number })
  @ApiResponse({ status: 204, description: "刪除成功" })
  @ApiResponse({ status: 404, description: "租戶不存在" })
  async remove(@Param("id", ParseIntPipe) id: number): Promise<void> {
    return this.tenantsService.remove(id);
  }

  @Get(":slug/database/check")
  @ApiOperation({ summary: "檢查租戶資料庫是否存在" })
  @ApiParam({ name: "slug", description: "租戶 slug", type: String })
  @ApiResponse({
    status: 200,
    description: "檢查成功",
    schema: {
      type: "object",
      properties: {
        exists: { type: "boolean" },
        dbName: { type: "string" },
      },
    },
  })
  async checkDatabase(@Param("slug") slug: string): Promise<{
    exists: boolean;
    dbName: string;
  }> {
    const exists = await this.tenantsService.checkTenantDatabase(slug);
    return {
      exists,
      dbName: `tenant_${slug}`,
    };
  }
}
