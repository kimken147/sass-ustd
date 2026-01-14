import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
} from "@nestjs/common";
import { Request } from "express";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { AgentLoginDto } from "./dto/agent-login.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { AuthResponseDto } from "./dto/auth-response.dto";
import { Public } from "./decorators/public.decorator";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { CurrentUser } from "./decorators/current-user.decorator";
import { TenantUser } from "@saas-platform/database";

/**
 * Tenant API 認證控制器
 *
 * 使用獨立的 Tenant DB，整個資料庫都屬於同一租戶
 * 因此不需要 tenant_id 來區分用戶
 */
@ApiTags("認證")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "站長/用戶登入（使用帳號）" })
  @ApiResponse({
    status: 200,
    description: "登入成功",
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: "帳號或密碼錯誤" })
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    // 不需要 tenantId，因為整個 DB 都是同一租戶
    return this.authService.login(loginDto);
  }

  @Public()
  @Post("agent/login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "代理登入（使用帳號）" })
  @ApiResponse({
    status: 200,
    description: "登入成功",
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: "帳號或密碼錯誤" })
  async agentLogin(
    @Body() agentLoginDto: AgentLoginDto,
  ): Promise<AuthResponseDto> {
    // 不需要 tenantId，因為整個 DB 都是同一租戶
    return this.authService.agentLogin(
      agentLoginDto.username,
      agentLoginDto.password,
    );
  }

  @Public()
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "刷新 Access Token" })
  @ApiResponse({
    status: 200,
    description: "刷新成功",
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: "無效的 Refresh Token" })
  async refresh(
    @Body() refreshTokenDto: RefreshTokenDto,
  ): Promise<AuthResponseDto> {
    return this.authService.refreshToken(refreshTokenDto.refreshToken);
  }

  @Post("logout")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "登出" })
  @ApiResponse({ status: 200, description: "登出成功" })
  @ApiResponse({ status: 401, description: "未授權" })
  async logout(
    @Req() request: Request,
    @CurrentUser() user: TenantUser,
    @Body() body?: { refreshToken?: string },
  ): Promise<{ message: string }> {
    // 從請求頭提取 access token
    const authHeader = request.headers.authorization;
    const accessToken = authHeader?.replace("Bearer ", "") || "";

    // 將 access token 和 refresh token（如果提供）加入黑名單
    await this.authService.logout(accessToken, body?.refreshToken);

    return { message: "登出成功" };
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "獲取當前用戶資訊" })
  @ApiResponse({ status: 200, description: "獲取成功" })
  @ApiResponse({ status: 401, description: "未授權" })
  async getMe(@CurrentUser() user: TenantUser): Promise<{
    id: number;
    email: string;
    name: string;
    role: string;
  }> {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }
}
