import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
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
  ApiParam,
  ApiQuery,
} from "@nestjs/swagger";
import { SystemWalletsService } from "./system-wallets.service";
import { CreateSystemWalletDto } from "./dto/create-system-wallet.dto";
import { UpdateSystemWalletDto } from "./dto/update-system-wallet.dto";
import { SystemWalletResponseDto } from "./dto/system-wallet-response.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import {
  SystemWalletChain,
  SystemWalletStatus,
  SystemWalletType,
} from "@saas-platform/database";

@ApiTags("系統商錢包管理")
@Controller("system-wallets")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SystemWalletsController {
  constructor(private readonly systemWalletsService: SystemWalletsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "創建系統商錢包" })
  @ApiResponse({
    status: 201,
    description: "錢包創建成功",
    type: SystemWalletResponseDto,
  })
  @ApiResponse({ status: 400, description: "請求參數錯誤" })
  @ApiResponse({ status: 409, description: "錢包地址已存在" })
  async create(
    @Body() createDto: CreateSystemWalletDto
  ): Promise<SystemWalletResponseDto> {
    return this.systemWalletsService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: "查詢所有系統商錢包" })
  @ApiQuery({
    name: "type",
    required: false,
    enum: SystemWalletType,
    description: "過濾錢包類型",
  })
  @ApiQuery({
    name: "chain",
    required: false,
    enum: SystemWalletChain,
    description: "過濾區塊鏈",
  })
  @ApiQuery({
    name: "status",
    required: false,
    enum: SystemWalletStatus,
    description: "過濾狀態",
  })
  @ApiResponse({
    status: 200,
    description: "查詢成功",
    type: [SystemWalletResponseDto],
  })
  async findAll(
    @Query("type") type?: SystemWalletType,
    @Query("chain") chain?: SystemWalletChain,
    @Query("status") status?: SystemWalletStatus
  ): Promise<SystemWalletResponseDto[]> {
    return this.systemWalletsService.findAll(type, chain, status);
  }

  @Get(":id")
  @ApiOperation({ summary: "根據 ID 查詢系統商錢包" })
  @ApiParam({ name: "id", description: "錢包 ID", type: Number })
  @ApiResponse({
    status: 200,
    description: "查詢成功",
    type: SystemWalletResponseDto,
  })
  @ApiResponse({ status: 404, description: "錢包不存在" })
  async findOne(
    @Param("id", ParseIntPipe) id: number
  ): Promise<SystemWalletResponseDto> {
    return this.systemWalletsService.findOne(id);
  }

  @Get("address/:address")
  @ApiOperation({ summary: "根據地址查詢系統商錢包" })
  @ApiParam({ name: "address", description: "錢包地址", type: String })
  @ApiQuery({
    name: "chain",
    required: false,
    enum: SystemWalletChain,
    description: "區塊鏈",
    default: SystemWalletChain.TRON,
  })
  @ApiResponse({
    status: 200,
    description: "查詢成功",
    type: SystemWalletResponseDto,
  })
  @ApiResponse({ status: 404, description: "錢包不存在" })
  async findByAddress(
    @Param("address") address: string,
    @Query("chain") chain?: SystemWalletChain
  ): Promise<SystemWalletResponseDto> {
    return this.systemWalletsService.findByAddress(
      address,
      chain || SystemWalletChain.TRON
    );
  }

  @Patch(":id")
  @ApiOperation({ summary: "更新系統商錢包" })
  @ApiParam({ name: "id", description: "錢包 ID", type: Number })
  @ApiResponse({
    status: 200,
    description: "更新成功",
    type: SystemWalletResponseDto,
  })
  @ApiResponse({ status: 404, description: "錢包不存在" })
  @ApiResponse({ status: 409, description: "地址衝突" })
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateDto: UpdateSystemWalletDto
  ): Promise<SystemWalletResponseDto> {
    return this.systemWalletsService.update(id, updateDto);
  }

  @Patch(":id/verify")
  @ApiOperation({ summary: "驗證錢包地址" })
  @ApiParam({ name: "id", description: "錢包 ID", type: Number })
  @ApiResponse({
    status: 200,
    description: "驗證成功",
    type: SystemWalletResponseDto,
  })
  @ApiResponse({ status: 404, description: "錢包不存在" })
  async verify(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { txHash: string }
  ): Promise<SystemWalletResponseDto> {
    return this.systemWalletsService.verify(id, body.txHash);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "刪除系統商錢包（軟刪除）" })
  @ApiParam({ name: "id", description: "錢包 ID", type: Number })
  @ApiResponse({ status: 204, description: "刪除成功" })
  @ApiResponse({ status: 404, description: "錢包不存在" })
  @ApiResponse({ status: 400, description: "無法刪除預設錢包" })
  async remove(@Param("id", ParseIntPipe) id: number): Promise<void> {
    return this.systemWalletsService.remove(id);
  }
}
