import { Injectable, Inject } from "@nestjs/common";
import { InjectRepository } from "@mikro-orm/nestjs";
import { EntityRepository, EntityManager } from "@mikro-orm/postgresql";
import { User } from "@saas-platform/database";
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
 * Platform API 認證服務
 * 只允許 PLATFORM_ADMIN 角色登入
 */
@Injectable()
export class AuthService extends BaseAuthService {
  protected readonly userRepository: EntityRepository<User>;
  protected readonly em: EntityManager;
  protected readonly jwtService: JwtService;
  protected readonly passwordService: PasswordService;
  protected readonly tokenBlacklist: TokenBlacklistService;
  protected readonly authConfig = AUTH_CONFIGS.PLATFORM;

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
   * 平台管理員登入
   */
  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const result = await this.doLogin(loginDto.username, loginDto.password);
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
      },
    };
  }
}
