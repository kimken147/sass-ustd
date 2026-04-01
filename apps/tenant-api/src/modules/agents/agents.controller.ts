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
  ParseIntPipe,
  NotFoundException,
  Inject,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";
import { EntityManager } from "@mikro-orm/postgresql";
import { AgentsService } from "./agents.service";
import { CreateAgentDto } from "./dto/create-agent.dto";
import { UpdateAgentDto } from "./dto/update-agent.dto";
import { UpdateAgentWalletDto } from "./dto/update-agent-wallet.dto";
import { AgentResponseDto } from "./dto/agent-response.dto";
import { QueryAgentsDto } from "./dto/query-agents.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { TenantAdminGuard } from "../revenue-wallets/guards/tenant-admin.guard";
import { AgentGuard } from "../customers/guards/agent.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { TenantUser, Agent, TenantConfig } from "@saas-platform/database";
import { TENANT_ENTITY_MANAGER } from "../../common/database";

/**
 * 代理管理控制器
 *
 * 使用獨立的 Tenant DB，整個資料庫都屬於同一租戶
 * 因此不需要 tenantId 參數
 */
@ApiTags("代理管理")
@Controller("agents")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AgentsController {
  constructor(
    private readonly agentsService: AgentsService,
    private readonly configService: ConfigService,
    @Inject(TENANT_ENTITY_MANAGER)
    private readonly em: EntityManager,
  ) {}

  // ========== 站長管理 API ==========

  @Get()
  @UseGuards(TenantAdminGuard)
  @ApiOperation({ summary: "獲取代理列表" })
  @ApiResponse({
    status: 200,
    description: "獲取成功",
    type: [AgentResponseDto],
  })
  @ApiResponse({ status: 403, description: "只有站長可以訪問" })
  async getAgents(@Query() query: QueryAgentsDto): Promise<AgentResponseDto[]> {
    const agents = await this.agentsService.getAgents(query);
    return Promise.all(agents.map((agent) => this.mapAgentToDto(agent)));
  }

  @Post()
  @UseGuards(TenantAdminGuard)
  @ApiOperation({ summary: "創建代理" })
  @ApiResponse({
    status: 201,
    description: "創建成功",
    type: AgentResponseDto,
  })
  @ApiResponse({ status: 400, description: "分潤比率總和不等於 100%" })
  @ApiResponse({ status: 409, description: "帳號、Email 或代理碼已存在" })
  @ApiResponse({ status: 403, description: "只有站長可以訪問" })
  async createAgent(@Body() dto: CreateAgentDto): Promise<AgentResponseDto> {
    const agent = await this.agentsService.createAgent(dto);
    return this.mapAgentToDto(agent);
  }

  // ========== 代理自己的 API ==========
  // 注意：具體路由必須在動態路由之前定義

  @Get("me")
  @UseGuards(AgentGuard)
  @ApiOperation({ summary: "獲取當前代理信息" })
  @ApiResponse({
    status: 200,
    description: "獲取成功",
    type: AgentResponseDto,
  })
  @ApiResponse({ status: 403, description: "只有代理可以訪問" })
  async getMyAgent(@CurrentUser() user: TenantUser): Promise<AgentResponseDto> {
    // 查找當前用戶對應的代理記錄
    const agent = await this.em.findOne(
      Agent,
      { user: user.id },
      { populate: ["user", "parentAgent"] }
    );

    if (!agent) {
      throw new Error("代理記錄不存在");
    }

    return this.mapAgentToDto(agent);
  }

  @Patch("me/wallet")
  @UseGuards(AgentGuard)
  @ApiOperation({ summary: "更新當前代理的收款錢包" })
  @ApiResponse({
    status: 200,
    description: "更新成功",
    type: AgentResponseDto,
  })
  @ApiResponse({ status: 403, description: "只有代理可以訪問" })
  async updateMyWallet(
    @CurrentUser() user: TenantUser,
    @Body() dto: UpdateAgentWalletDto
  ): Promise<AgentResponseDto> {
    // 查找當前用戶對應的代理記錄
    const agent = await this.em.findOne(
      Agent,
      { user: user.id },
      { populate: ["user", "parentAgent"] }
    );

    if (!agent) {
      throw new Error("代理記錄不存在");
    }

    // 使用現有的 updateAgent 方法，但只更新錢包地址
    const updatedAgent = await this.agentsService.updateAgent(agent.id, {
      walletAddress: dto.walletAddress,
    });

    return this.mapAgentToDto(updatedAgent);
  }

  @Get("me/subordinates")
  @UseGuards(AgentGuard)
  @ApiOperation({ summary: "獲取當前代理的下級代理列表" })
  @ApiResponse({
    status: 200,
    description: "獲取成功",
    type: [AgentResponseDto],
  })
  @ApiResponse({ status: 403, description: "只有代理可以訪問" })
  async getMySubAgents(
    @CurrentUser() user: TenantUser,
    @Query() query: QueryAgentsDto
  ): Promise<AgentResponseDto[]> {
    // 查找當前用戶對應的代理記錄
    const agent = await this.em.findOne(
      Agent,
      { user: user.id },
      { populate: ["user", "parentAgent"] }
    );

    if (!agent) {
      throw new Error("代理記錄不存在");
    }

    // 獲取下級代理列表
    const subAgents = await this.agentsService.getSubAgents(agent.id, query);
    return Promise.all(subAgents.map((subAgent) => this.mapAgentToDto(subAgent)));
  }

  @Post("me/subordinates")
  @UseGuards(AgentGuard)
  @ApiOperation({ summary: "創建當前代理的下級代理" })
  @ApiResponse({
    status: 201,
    description: "創建成功",
    type: AgentResponseDto,
  })
  @ApiResponse({ status: 400, description: "分潤比率總和不等於 100%" })
  @ApiResponse({ status: 409, description: "帳號、Email 或代理碼已存在" })
  @ApiResponse({ status: 403, description: "只有代理可以訪問" })
  async createMySubAgent(
    @CurrentUser() user: TenantUser,
    @Body() dto: CreateAgentDto
  ): Promise<AgentResponseDto> {
    // 查找當前用戶對應的代理記錄
    const currentAgent = await this.em.findOne(
      Agent,
      { user: user.id },
      { populate: ["user", "parentAgent"] }
    );

    if (!currentAgent) {
      throw new Error("代理記錄不存在");
    }

    // 自動設置 parentAgentId 為當前代理的 ID
    const createDto = {
      ...dto,
      parentAgentId: currentAgent.id,
    };

    const agent = await this.agentsService.createAgent(createDto);
    return this.mapAgentToDto(agent);
  }

  @Patch("me/subordinates/:id")
  @UseGuards(AgentGuard)
  @ApiOperation({ summary: "編輯當前代理的下級代理" })
  @ApiResponse({
    status: 200,
    description: "更新成功",
    type: AgentResponseDto,
  })
  @ApiResponse({ status: 403, description: "只有代理可以訪問" })
  @ApiResponse({ status: 404, description: "下級代理不存在或無權限" })
  async updateMySubAgent(
    @CurrentUser() user: TenantUser,
    @Param("id", ParseIntPipe) subAgentId: number,
    @Body() dto: UpdateAgentDto
  ): Promise<AgentResponseDto> {
    // 查找當前用戶對應的代理記錄
    const currentAgent = await this.em.findOne(
      Agent,
      { user: user.id },
      { populate: ["user", "parentAgent"] }
    );

    if (!currentAgent) {
      throw new Error("代理記錄不存在");
    }

    // 驗證要編輯的代理是否是當前代理的下級
    const subAgents = await this.agentsService.getSubAgents(currentAgent.id);
    const targetSubAgent = subAgents.find((a) => a.id === subAgentId);

    if (!targetSubAgent) {
      throw new NotFoundException("下級代理不存在或無權限訪問");
    }

    // 更新下級代理
    const updatedAgent = await this.agentsService.updateAgent(subAgentId, dto);
    return this.mapAgentToDto(updatedAgent);
  }

  // ========== 站長管理 API（動態路由）==========
  // 注意：動態路由必須在所有具體路由之後定義

  @Get(":id")
  @UseGuards(TenantAdminGuard)
  @ApiOperation({ summary: "獲取單個代理詳情" })
  @ApiResponse({
    status: 200,
    description: "獲取成功",
    type: AgentResponseDto,
  })
  @ApiResponse({ status: 404, description: "代理不存在" })
  @ApiResponse({ status: 403, description: "只有站長可以訪問" })
  async getAgent(
    @Param("id", ParseIntPipe) agentId: number
  ): Promise<AgentResponseDto> {
    const agent = await this.agentsService.getAgent(agentId);
    return this.mapAgentToDto(agent);
  }

  @Patch(":id")
  @UseGuards(TenantAdminGuard)
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
    @Param("id", ParseIntPipe) agentId: number,
    @Body() dto: UpdateAgentDto
  ): Promise<AgentResponseDto> {
    const agent = await this.agentsService.updateAgent(agentId, dto);
    return this.mapAgentToDto(agent);
  }

  @Delete(":id")
  @UseGuards(TenantAdminGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "刪除代理（軟刪除）" })
  @ApiResponse({ status: 204, description: "刪除成功" })
  @ApiResponse({ status: 404, description: "代理不存在" })
  @ApiResponse({ status: 400, description: "存在下級代理，無法刪除" })
  @ApiResponse({ status: 403, description: "只有站長可以訪問" })
  async deleteAgent(@Param("id", ParseIntPipe) agentId: number): Promise<void> {
    return this.agentsService.deleteAgent(agentId);
  }

  /**
   * 將 Agent 實體轉換為 DTO
   */
  private async mapAgentToDto(agent: Agent): Promise<AgentResponseDto> {
    // 生成推薦連結
    const referralLink = await this.generateReferralLink(agent);

    // 獲取分配比率（僅對非站長代理）
    let allocatedRate: number | undefined;
    if (agent.level > 0) {
      try {
        allocatedRate = await this.agentsService.getAgentAllocatedRate(agent.id);
      } catch {
        // 如果無法獲取，保持 undefined
      }
    }

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
      allocatedRate,
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
  private async generateReferralLink(agent: Agent): Promise<string> {
    // 獲取租戶配置
    const config = await this.em.findOne(TenantConfig, { id: 1 });

    let baseUrl: string;

    if (config?.customUrl) {
      // 如果有自訂 URL，使用它（可能包含協議）
      baseUrl = config.customUrl.startsWith("http")
        ? config.customUrl
        : `https://${config.customUrl}`;
    } else if (config?.customDomain) {
      // 如果有自訂域名，使用它
      baseUrl = `https://${config.customDomain}`;
    } else {
      // 否則使用環境變數中的前端 URL
      baseUrl =
        this.configService.get<string>("FRONTEND_URL") ||
        this.configService.get<string>("CUSTOMER_WEB_URL") ||
        "https://example.com";
    }

    // 生成推薦連結格式：{baseUrl}/redirect?ref={agentCode}&wallet=tronlink
    return `${baseUrl}/redirect?ref=${agent.code}&wallet=tronlink`;
  }
}
