export {
  PlatformApiClient,
  createPlatformApiClient,
  getPlatformApiClient,
} from './platform/client';
export type {
  PlatformApiConfig,
  LoginRequest as PlatformLoginRequest,
  AuthResponse as PlatformAuthResponse,
  RefreshTokenRequest as PlatformRefreshTokenRequest,
  UserInfo as PlatformUserInfo,
} from './platform/client';

export {
  TenantApiClient,
  createTenantApiClient,
  getTenantApiClient,
} from './tenant/client';
export type {
  TenantApiConfig,
  LoginRequest,
  AuthResponse,
  RefreshTokenRequest,
  UserInfo,
} from './tenant/client';
