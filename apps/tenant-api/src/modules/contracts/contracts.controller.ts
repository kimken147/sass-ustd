import {
  Controller,
  Get,
  Post,
  Body,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiHeader,
} from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";
import { ContractsService } from "./contracts.service";
import { ExecuteContractDto } from "./dto/execute-contract.dto";
import { ContractInfoDto } from "./dto/contract-info.dto";
import { ExecuteContractResponseDto } from "./dto/execute-contract-response.dto";
import { ProcessInvestmentDto } from "./dto/process-investment.dto";
import { Public } from "../auth/decorators/public.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { User } from "@saas-platform/database";

@ApiTags("合約執行")
@Controller("contracts")
export class ContractsController {
  constructor(
    private readonly contractsService: ContractsService,
    private readonly configService: ConfigService
  ) {}

  @Get("info")
  @Public()
  @ApiOperation({ summary: "獲取合約資訊" })
  @ApiHeader({
    name: "X-Tenant-Id",
    description: "租戶 ID（可選，如果未提供則從環境變數獲取）",
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: "獲取成功",
    type: ContractInfoDto,
  })
  @ApiResponse({ status: 404, description: "租戶不存在" })
  async getContractInfo(
    @CurrentUser() user?: User,
    @Headers("x-tenant-id") tenantIdHeader?: string
  ): Promise<ContractInfoDto> {
    const tenantId =
      user?.tenant?.id ||
      (tenantIdHeader ? parseInt(tenantIdHeader) : undefined) ||
      parseInt(this.configService.get<string>("TENANT_ID") || "1");
    return this.contractsService.getContractInfo(tenantId);
  }

  @Post("execute")
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "執行合約（創建或更新會員）" })
  @ApiHeader({
    name: "X-Tenant-Id",
    description: "租戶 ID（可選，如果未提供則從環境變數獲取）",
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: "執行成功",
    type: ExecuteContractResponseDto,
  })
  @ApiResponse({ status: 400, description: "參數錯誤" })
  @ApiResponse({ status: 404, description: "代理推薦碼不存在" })
  @ApiResponse({ status: 409, description: "帳號或 Email 已存在" })
  async executeContract(
    @Body() dto: ExecuteContractDto,
    @CurrentUser() user?: User,
    @Headers("x-tenant-id") tenantIdHeader?: string
  ): Promise<ExecuteContractResponseDto> {
    const tenantId =
      user?.tenant?.id ||
      (tenantIdHeader ? parseInt(tenantIdHeader) : undefined) ||
      parseInt(this.configService.get<string>("TENANT_ID") || "1");
    return this.contractsService.executeContract(tenantId, dto);
  }

  @Post("process-investment")
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "處理投資並進行分潤" })
  @ApiHeader({
    name: "X-Tenant-Id",
    description: "租戶 ID（可選，如果未提供則從環境變數獲取）",
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: "處理成功",
  })
  @ApiResponse({ status: 400, description: "參數錯誤或投資金額不符合限制" })
  @ApiResponse({ status: 404, description: "租戶或會員不存在" })
  async processInvestment(
    @Body() dto: ProcessInvestmentDto,
    @CurrentUser() user?: User,
    @Headers("x-tenant-id") tenantIdHeader?: string
  ) {
    const tenantId =
      user?.tenant?.id ||
      (tenantIdHeader ? parseInt(tenantIdHeader) : undefined) ||
      parseInt(this.configService.get<string>("TENANT_ID") || "1");
    return this.contractsService.processInvestment(tenantId, dto);
  }
}
