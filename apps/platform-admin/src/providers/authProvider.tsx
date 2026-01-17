import { AuthProvider } from '@refinedev/core';
import { getPlatformApiClient, PlatformUserInfo } from '@saas-platform/api-client';

export const authProvider: AuthProvider = {
  login: async ({ username, password }) => {
    try {
      const client = getPlatformApiClient();
      const response = await client.login({ username, password });

      return {
        success: true,
        redirectTo: '/',
        user: response.user,
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          name: 'LoginError',
          message:
            error.response?.data?.message ||
            error.message ||
            '登入失败，请检查您的帐号和密码',
        },
      };
    }
  },

  logout: async () => {
    try {
      const client = getPlatformApiClient();
      const refreshToken = client.getRefreshToken();
      await client.logout(refreshToken || undefined);
    } catch (error) {
      console.error('Logout error:', error);
    }

    return {
      success: true,
      redirectTo: '/login',
    };
  },

  check: async () => {
    const client = getPlatformApiClient();
    const token = client.getAccessToken();

    if (token) {
      try {
        // 验证 token 是否有效
        await client.getMe();
        return {
          authenticated: true,
        };
      } catch (error) {
        // Token 无效，尝试刷新
        const refreshToken = client.getRefreshToken();
        if (refreshToken) {
          try {
            await client.refreshToken(refreshToken);
            return {
              authenticated: true,
            };
          } catch (refreshError) {
            // 刷新失败，清除 token
            client.clearToken();
            return {
              authenticated: false,
              redirectTo: '/login',
              logout: true,
            };
          }
        } else {
          client.clearToken();
          return {
            authenticated: false,
            redirectTo: '/login',
            logout: true,
          };
        }
      }
    }

    return {
      authenticated: false,
      redirectTo: '/login',
      logout: true,
    };
  },

  onError: async (error) => {
    // 检查 status（标准格式）或 statusCode（HttpError 格式）
    const statusCode = error?.status || error?.statusCode;
    if (statusCode === 401) {
      const client = getPlatformApiClient();
      client.clearToken();
      return {
        logout: true,
        redirectTo: '/login',
        error: {
          name: '登录已过期',
          message: '您的登录已过期，请重新登录',
        },
      };
    }

    return { error };
  },

  getIdentity: async () => {
    try {
      const client = getPlatformApiClient();
      const user = await client.getMe();
      return user;
    } catch (error) {
      return null;
    }
  },

  register: async () => {
    // 平台管理后台不支援注册
    return {
      success: false,
      error: {
        name: 'RegisterError',
        message: '平台管理后台不支援注册功能',
      },
    };
  },

  forgotPassword: async () => {
    // TODO: 实作忘记密码功能
    return {
      success: false,
      error: {
        name: 'ForgotPasswordError',
        message: '忘记密码功能尚未实作',
      },
    };
  },

  updatePassword: async () => {
    // TODO: 实作更新密码功能
    return {
      success: false,
      error: {
        name: 'UpdatePasswordError',
        message: '更新密码功能尚未实作',
      },
    };
  },

  getPermissions: async () => {
    try {
      const identity = (await authProvider.getIdentity?.()) as PlatformUserInfo | null;
      return identity?.role ? [identity.role] : [];
    } catch {
      return [];
    }
  },
};
