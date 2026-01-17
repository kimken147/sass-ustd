import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { RevenueWalletsService } from "./revenue-wallets.service";
import { CreateRevenueWalletDto } from "./dto/create-revenue-wallet.dto";
import { UpdateRevenueWalletDto } from "./dto/update-revenue-wallet.dto";
import { SetRevenueWalletsDto } from "./dto/set-revenue-wallets.dto";
import { RevenueWalletResponseDto } from "./dto/revenue-wallet-response.dto";
import { RevenueWalletListResponseDto } from "./dto/list-response.dto";
import { QueryRevenueWalletsDto } from "./dto/query-revenue-wallets.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { TenantAdminGuard } from "./guards/tenant-admin.guard";

/**
 * 分潤錢包管理控制器
 *
 * 使用獨立的 Tenant DB，配置存放在 tenant_config 表
 * 因此不需要 tenantId 參數
 */
@ApiTags("分潤錢包管理")
@Controller("revenue-wallets")
@UseGuards(JwtAuthGuard, TenantAdminGuard)
@ApiBearerAuth()
export class RevenueWalletsController {
  constructor(private readonly revenueWalletsService: RevenueWalletsService) {}

  @Get()
  @ApiOperation({ summary: "獲取分潤錢包列表" })
  @ApiResponse({
    status: 200,
    description: "獲取成功",
    type: RevenueWalletListResponseDto,
  })
  @ApiResponse({ status: 403, description: "只有站長可以訪問" })
  async getRevenueWallets(
    @Query() query: QueryRevenueWalletsDto
  ): Promise<RevenueWalletListResponseDto> {
    const wallets = await this.revenueWalletsService.getRevenueWallets(query);
    return {
      data: wallets,
      total: wallets.length,
    };
  }

  @Post("set")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "設置分潤錢包列表（替換所有）" })
  @ApiResponse({
    status: 200,
    description: "設置成功",
    type: [RevenueWalletResponseDto],
  })
  @ApiResponse({ status: 400, description: "分潤比例總和不等於 100%" })
  @ApiResponse({ status: 403, description: "只有站長可以訪問" })
  async setRevenueWallets(
    @Body() dto: SetRevenueWalletsDto
  ): Promise<RevenueWalletResponseDto[]> {
    return this.revenueWalletsService.setRevenueWallets(dto);
  }

  @Post()
  @ApiOperation({ summary: "添加單個分潤錢包" })
  @ApiResponse({
    status: 201,
    description: "添加成功",
    type: RevenueWalletResponseDto,
  })
  @ApiResponse({ status: 400, description: "分潤比例總和超過 100%" })
  @ApiResponse({ status: 403, description: "只有站長可以訪問" })
  async createRevenueWallet(
    @Body() dto: CreateRevenueWalletDto
  ): Promise<RevenueWalletResponseDto> {
    return this.revenueWalletsService.createRevenueWallet(dto);
  }

  @Patch(":id")
  @ApiOperation({ summary: "更新單個分潤錢包" })
  @ApiResponse({
    status: 200,
    description: "更新成功",
    type: RevenueWalletResponseDto,
  })
  @ApiResponse({ status: 404, description: "錢包不存在" })
  @ApiResponse({ status: 400, description: "分潤比例總和不等於 100%" })
  @ApiResponse({ status: 403, description: "只有站長可以訪問" })
  async updateRevenueWallet(
    @Param("id") walletId: string,
    @Body() dto: UpdateRevenueWalletDto
  ): Promise<RevenueWalletResponseDto> {
    return this.revenueWalletsService.updateRevenueWallet(walletId, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "刪除單個分潤錢包" })
  @ApiResponse({ status: 204, description: "刪除成功" })
  @ApiResponse({ status: 404, description: "錢包不存在" })
  @ApiResponse({ status: 400, description: "刪除後分潤比例總和不等於 100%" })
  @ApiResponse({ status: 403, description: "只有站長可以訪問" })
  async deleteRevenueWallet(@Param("id") walletId: string): Promise<void> {
    return this.revenueWalletsService.deleteRevenueWallet(walletId);
  }
}
