import { Injectable, UnauthorizedException, Inject } from "@nestjs/common";
import { EntityManager } from "@mikro-orm/postgresql";
import {
  TenantUser,
  UserRole,
  UserStatus,
  Agent,
  AgentStatus,
} from "@saas-platform/database";
import {
  JwtService,
  PasswordService,
  TokenBlacklistService,
  BaseAuthService,
  AUTH_CONFIGS,
} from "@saas-platform/auth";
import { LoginDto } from "./dto/login.dto";
import { AuthResponseDto } from "./dto/auth-response.dto";
import { TenantContextService } from "../../common/tenant-context";
import { TENANT_ENTITY_MANAGER } from "../../common/database";

/**
 * Tenant API 認證服務
 *
 * 使用獨立的 Tenant DB，整個資料庫都屬於同一租戶
 * 因此不需要 tenant_id 來區分用戶
 *
 * 允許 TENANT_ADMIN, AGENT, CUSTOMER 角色登入
 * 支援代理登入（使用代理碼）
 */
@Injectable()
export class AuthService extends BaseAuthService {
  protected readonly em: EntityManager;
  protected readonly jwtService: JwtService;
  protected readonly passwordService: PasswordService;
  protected readonly tokenBlacklist: TokenBlacklistService;
  protected readonly authConfig = AUTH_CONFIGS.TENANT;

  // Create a wrapper to satisfy the abstract userRepository property
  protected get userRepository() {
    const em = this.em;
    return {
      findOne: (where: any) => em.findOne(TenantUser, where),
    };
  }

  constructor(
    @Inject(TENANT_ENTITY_MANAGER)
    em: EntityManager,
    jwtService: JwtService,
    passwordService: PasswordService,
    @Inject("TokenBlacklistService")
    tokenBlacklist: TokenBlacklistService,
    private readonly tenantContextService: TenantContextService
  ) {
    super();
    this.em = em;
    this.jwtService = jwtService;
    this.passwordService = passwordService;
    this.tokenBlacklist = tokenBlacklist;
  }

  /**
   * 租戶用戶登入（Tenant Admin, Agent, Customer）
   * 不需要 tenantId 參數，因為整個 DB 都是同一租戶
   */
  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const tenantSlug = this.tenantContextService.getTenantSlugOrThrow();
    const result = await this.doLogin(loginDto.username, loginDto.password);

    // 重新生成包含 tenantSlug 的 token
    const tokenPair = this.jwtService.generateTokenPair({
      sub: result.user.id,
      email: result.user.email,
      role: result.user.role,
      tenantSlug: tenantSlug,
    });

    return {
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      expiresIn: tokenPair.expiresIn,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
      },
    };
  }

  /**
   * 代理登入（使用 username）
   * 這是 tenant-api 特有的功能
   * 不需要 tenantId，因為整個 DB 都是同一租戶
   */
  async agentLogin(
    username: string,
    password: string
  ): Promise<AuthResponseDto> {
    const tenantSlug = this.tenantContextService.getTenantSlugOrThrow();

    // 查找用戶（必須是 AGENT 角色）
    const user = await this.userRepository.findOne({
      username,
      role: UserRole.AGENT,
      status: UserStatus.ACTIVE,
    });

    if (!user) {
      throw new UnauthorizedException("帳號或密碼錯誤");
    }

    // 驗證密碼
    const isPasswordValid = await this.passwordService.verifyPassword(
      password,
      user.password
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException("帳號或密碼錯誤");
    }

    // 查找對應的代理記錄
    const agent = await this.em.findOne(Agent, {
      user: user.id,
      status: AgentStatus.ACTIVE,
    });

    if (!agent) {
      throw new UnauthorizedException("代理記錄不存在或已被停用");
    }

    // 生成包含 tenantSlug 的 Token
    const tokenPair = this.jwtService.generateTokenPair({
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantSlug: tenantSlug,
    });

    // 更新最後登入時間
    user.lastLoginAt = new Date();
    await this.em.flush();

    return {
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      expiresIn: tokenPair.expiresIn,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        agentId: agent.id, // 額外返回代理 ID
      },
    };
  }

  /**
   * 刷新 Token
   */
  async refreshToken(refreshToken: string): Promise<AuthResponseDto> {
    const tenantSlug = this.tenantContextService.getTenantSlugOrThrow();
    const result = await this.doRefreshToken(refreshToken);

    // 重新生成包含 tenantSlug 的 token
    const tokenPair = this.jwtService.generateTokenPair({
      sub: result.user.id,
      email: result.user.email,
      role: result.user.role,
      tenantSlug: tenantSlug,
    });

    return {
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      expiresIn: tokenPair.expiresIn,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
      },
    };
  }

  /**
   * 登出
   */
  async logout(accessToken: string, refreshToken?: string): Promise<void> {
    return super.logout(accessToken, refreshToken);
  }
}
