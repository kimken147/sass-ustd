import { AuthProvider } from '@refinedev/core';
import { getTenantApiClient } from '@saas-platform/api-client';

export const authProvider: AuthProvider = {
  login: async ({ username, password }) => {
    try {
      const client = getTenantApiClient();
      // 使用 agent 登入端點
      const response = await client.request({
        method: 'POST',
        url: '/api/auth/agent/login',
        data: { username, password },
      });

      // 設置 token
      if (response.accessToken) {
        client.setAccessToken(response.accessToken);
      }
      if (response.refreshToken) {
        client.setRefreshToken(response.refreshToken);
      }

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
            '登入失敗，請檢查您的帳號和密碼',
        },
      };
    }
  },

  logout: async () => {
    try {
      const client = getTenantApiClient();
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
    const client = getTenantApiClient();
    const token = client.getAccessToken();

    if (token) {
      try {
        // 驗證 token 是否有效
        await client.getMe();
        return {
          authenticated: true,
        };
      } catch (error) {
        // Token 無效，嘗試刷新
        const refreshToken = client.getRefreshToken();
        if (refreshToken) {
          try {
            await client.refreshToken(refreshToken);
            return {
              authenticated: true,
            };
          } catch (refreshError) {
            // 刷新失敗，清除 token
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
    // 檢查 status（標準格式）或 statusCode（HttpError 格式）
    const statusCode = error?.status || error?.statusCode;
    if (statusCode === 401) {
      const client = getTenantApiClient();
      client.clearToken();
      return {
        logout: true,
        redirectTo: '/login',
        error,
      };
    }

    return { error };
  },

  getIdentity: async () => {
    try {
      const client = getTenantApiClient();
      const user = await client.getMe();
      return user;
    } catch (error) {
      return null;
    }
  },

  register: async () => {
    // 代理商後台不支援註冊
    return {
      success: false,
      error: {
        name: 'RegisterError',
        message: '代理商後台不支援註冊功能',
      },
    };
  },

  forgotPassword: async () => {
    // TODO: 實作忘記密碼功能
    return {
      success: false,
      error: {
        name: 'ForgotPasswordError',
        message: '忘記密碼功能尚未實作',
      },
    };
  },

  updatePassword: async () => {
    // TODO: 實作更新密碼功能
    return {
      success: false,
      error: {
        name: 'UpdatePasswordError',
        message: '更新密碼功能尚未實作',
      },
    };
  },

  getPermissions: async () => {
    try {
      const identity = await authProvider.getIdentity?.();
      return identity?.role ? [identity.role] : [];
    } catch (error) {
      return [];
    }
  },
};
