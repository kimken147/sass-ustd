import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";
import { AgentsService } from "./agents.service";
import { CreateAgentDto } from "./dto/create-agent.dto";
import { UpdateAgentDto } from "./dto/update-agent.dto";
import { AgentResponseDto } from "./dto/agent-response.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { TenantAdminGuard } from "../revenue-wallets/guards/tenant-admin.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { User, Agent } from "@saas-platform/database";

@ApiTags("代理管理")
@Controller("agents")
@UseGuards(JwtAuthGuard, TenantAdminGuard)
@ApiBearerAuth()
export class AgentsController {
  constructor(
    private readonly agentsService: AgentsService,
    private readonly configService: ConfigService
  ) {}

  @Get()
  @ApiOperation({ summary: "獲取代理列表" })
  @ApiResponse({
    status: 200,
    description: "獲取成功",
    type: [AgentResponseDto],
  })
  @ApiResponse({ status: 403, description: "只有站長可以訪問" })
  async getAgents(@CurrentUser() user: User): Promise<AgentResponseDto[]> {
    const tenantId = user.tenant?.id;
    if (!tenantId) {
      throw new Error("用戶未關聯租戶");
    }
    const agents = await this.agentsService.getAgents(tenantId);
    return agents.map((agent) => this.mapAgentToDto(agent));
  }

  @Get(":id")
  @ApiOperation({ summary: "獲取單個代理詳情" })
  @ApiResponse({
    status: 200,
    description: "獲取成功",
    type: AgentResponseDto,
  })
  @ApiResponse({ status: 404, description: "代理不存在" })
  @ApiResponse({ status: 403, description: "只有站長可以訪問" })
  async getAgent(
    @CurrentUser() user: User,
    @Param("id", ParseIntPipe) agentId: number
  ): Promise<AgentResponseDto> {
    const tenantId = user.tenant?.id;
    if (!tenantId) {
      throw new Error("用戶未關聯租戶");
    }
    const agent = await this.agentsService.getAgent(tenantId, agentId);
    return this.mapAgentToDto(agent);
  }

  @Post()
  @ApiOperation({ summary: "創建代理" })
  @ApiResponse({
    status: 201,
    description: "創建成功",
    type: AgentResponseDto,
  })
  @ApiResponse({ status: 400, description: "分潤比率總和不等於 100%" })
  @ApiResponse({ status: 409, description: "帳號、Email 或代理碼已存在" })
  @ApiResponse({ status: 403, description: "只有站長可以訪問" })
  async createAgent(
    @CurrentUser() user: User,
    @Body() dto: CreateAgentDto
  ): Promise<AgentResponseDto> {
    const tenantId = user.tenant?.id;
    if (!tenantId) {
      throw new Error("用戶未關聯租戶");
    }
    const agent = await this.agentsService.createAgent(tenantId, dto);
    return this.mapAgentToDto(agent);
  }

  @Patch(":id")
  @ApiOperation({ summary: "更新代理" })
  @ApiResponse({
    status: 200,
    description: "更新成功",
    type: AgentResponseDto,
  })
  @ApiResponse({ status: 404, description: "代理不存在" })
  @ApiResponse({ status: 400, description: "分潤比率總和不等於 100%" })
  @ApiResponse({ status: 403, description: "只有站長可以訪問" })
  async updateAgent(
    @CurrentUser() user: User,
    @Param("id", ParseIntPipe) agentId: number,
    @Body() dto: UpdateAgentDto
  ): Promise<AgentResponseDto> {
    const tenantId = user.tenant?.id;
    if (!tenantId) {
      throw new Error("用戶未關聯租戶");
    }
    const agent = await this.agentsService.updateAgent(tenantId, agentId, dto);
    return this.mapAgentToDto(agent);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "刪除代理（軟刪除）" })
  @ApiResponse({ status: 204, description: "刪除成功" })
  @ApiResponse({ status: 404, description: "代理不存在" })
  @ApiResponse({ status: 400, description: "存在下級代理，無法刪除" })
  @ApiResponse({ status: 403, description: "只有站長可以訪問" })
  async deleteAgent(
    @CurrentUser() user: User,
    @Param("id", ParseIntPipe) agentId: number
  ): Promise<void> {
    const tenantId = user.tenant?.id;
    if (!tenantId) {
      throw new Error("用戶未關聯租戶");
    }
    return this.agentsService.deleteAgent(tenantId, agentId);
  }

  /**
   * 將 Agent 實體轉換為 DTO
   */
  private mapAgentToDto(agent: Agent): AgentResponseDto {
    // 生成推薦連結
    const referralLink = this.generateReferralLink(agent);

    return {
      id: agent.id,
      userId: agent.user.id,
      username: agent.user.username,
      name: agent.name,
      code: agent.code,
      referralLink,
      parentAgentId: agent.parentAgent?.id,
      path: agent.path,
      level: agent.level,
      wallet: agent.wallet,
      commission: agent.commission,
      status: agent.status,
      stats: agent.stats,
      notes: agent.notes,
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt,
    };
  }

  /**
   * 生成代理推薦連結
   */
  private generateReferralLink(agent: Agent): string {
    // 優先使用租戶的自訂 URL
    const tenant = agent.tenant;
    let baseUrl: string;

    if (tenant?.customUrl) {
      // 如果有自訂 URL，使用它（可能包含協議）
      baseUrl = tenant.customUrl.startsWith("http")
        ? tenant.customUrl
        : `https://${tenant.customUrl}`;
    } else if (tenant?.customDomain) {
      // 如果有自訂域名，使用它
      baseUrl = `https://${tenant.customDomain}`;
    } else {
      // 否則使用環境變數中的前端 URL
      baseUrl =
        this.configService.get<string>("FRONTEND_URL") ||
        this.configService.get<string>("CUSTOMER_WEB_URL") ||
        "https://example.com";
    }

    // 生成推薦連結格式：{baseUrl}/register?ref={agentCode}
    return `${baseUrl}/register?ref=${agent.code}`;
  }
}
