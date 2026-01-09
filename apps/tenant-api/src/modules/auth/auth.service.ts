import { Injectable, UnauthorizedException, Inject } from "@nestjs/common";
import { InjectRepository } from "@mikro-orm/nestjs";
import { EntityRepository, EntityManager } from "@mikro-orm/postgresql";
import {
  User,
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

/**
 * Tenant API 認證服務
 * 允許 TENANT_ADMIN, AGENT, CUSTOMER 角色登入
 * 支援代理登入（使用代理碼）
 */
@Injectable()
export class AuthService extends BaseAuthService {
  protected readonly userRepository: EntityRepository<User>;
  protected readonly em: EntityManager;
  protected readonly jwtService: JwtService;
  protected readonly passwordService: PasswordService;
  protected readonly tokenBlacklist: TokenBlacklistService;
  protected readonly authConfig = AUTH_CONFIGS.TENANT;

  constructor(
    @InjectRepository(User)
    userRepository: EntityRepository<User>,
    em: EntityManager,
    jwtService: JwtService,
    passwordService: PasswordService,
    @Inject("TokenBlacklistService")
    tokenBlacklist: TokenBlacklistService
  ) {
    super();
    this.userRepository = userRepository;
    this.em = em;
    this.jwtService = jwtService;
    this.passwordService = passwordService;
    this.tokenBlacklist = tokenBlacklist;
  }

  /**
   * 租戶用戶登入（Tenant Admin, Agent, Customer）
   */
  async login(loginDto: LoginDto, tenantId?: number): Promise<AuthResponseDto> {
    const result = await this.doLogin(
      loginDto.username,
      loginDto.password,
      tenantId
    );
    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresIn: result.expiresIn,
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
   */
  async agentLogin(
    username: string,
    password: string,
    tenantId: number
  ): Promise<AuthResponseDto> {
    // 先查找用戶（必須是 AGENT 角色）
    const user = await this.userRepository.findOne({
      username,
      role: UserRole.AGENT,
      tenant: tenantId,
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
    const agent = await this.em.findOne(
      Agent,
      {
        user: user.id,
        tenant: tenantId,
        status: AgentStatus.ACTIVE,
      },
      {
        populate: ["tenant"],
      }
    );

    if (!agent) {
      throw new UnauthorizedException("代理記錄不存在或已被停用");
    }

    // 生成 Token
    const tokenPair = this.jwtService.generateTokenPair({
      sub: user.id,
      email: user.email,
      role: user.role,
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
        tenantId: user.tenant?.id,
        agentId: agent.id, // 額外返回代理 ID
      },
    };
  }

  /**
   * 刷新 Token
   */
  async refreshToken(refreshToken: string): Promise<AuthResponseDto> {
    const result = await this.doRefreshToken(refreshToken);
    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresIn: result.expiresIn,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
        tenantId: result.user.tenantId,
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
