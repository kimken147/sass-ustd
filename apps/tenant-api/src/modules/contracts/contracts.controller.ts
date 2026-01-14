import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
} from "@nestjs/swagger";
import { ContractsService } from "./contracts.service";
import { ExecuteContractDto } from "./dto/execute-contract.dto";
import { ContractInfoDto } from "./dto/contract-info.dto";
import { ExecuteContractResponseDto } from "./dto/execute-contract-response.dto";
import { ProcessInvestmentDto } from "./dto/process-investment.dto";
import { Public } from "../auth/decorators/public.decorator";

/**
 * 合約執行控制器
 *
 * 使用獨立的 Tenant DB，配置存放在 tenant_config 表
 * 因此不需要 tenantId 參數
 */
@ApiTags("合約執行")
@Controller("contracts")
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Get("info")
  @Public()
  @ApiOperation({ summary: "獲取合約資訊" })
  @ApiResponse({
    status: 200,
    description: "獲取成功",
    type: ContractInfoDto,
  })
  @ApiResponse({ status: 404, description: "租戶配置不存在" })
  async getContractInfo(): Promise<ContractInfoDto> {
    return this.contractsService.getContractInfo();
  }

  @Post("execute")
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "執行合約（創建或更新會員）" })
  @ApiResponse({
    status: 200,
    description: "執行成功",
    type: ExecuteContractResponseDto,
  })
  @ApiResponse({ status: 400, description: "參數錯誤" })
  @ApiResponse({ status: 404, description: "代理推薦碼不存在" })
  @ApiResponse({ status: 409, description: "帳號或 Email 已存在" })
  async executeContract(
    @Body() dto: ExecuteContractDto
  ): Promise<ExecuteContractResponseDto> {
    return this.contractsService.executeContract(dto);
  }

  @Post("process-investment")
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "處理投資並進行分潤" })
  @ApiResponse({
    status: 200,
    description: "處理成功",
  })
  @ApiResponse({ status: 400, description: "參數錯誤或投資金額不符合限制" })
  @ApiResponse({ status: 404, description: "租戶配置或會員不存在" })
  async processInvestment(@Body() dto: ProcessInvestmentDto) {
    return this.contractsService.processInvestment(dto);
  }
}
