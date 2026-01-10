import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

export interface TenantApiConfig {
  baseURL: string;
  timeout?: number;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: number;
    email: string;
    name: string;
    role: string;
    tenantId?: number;
    agentId?: number;
  };
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface UserInfo {
  id: number;
  email: string;
  name: string;
  role: string;
  tenantId?: number;
  agentId?: number;
}

export class TenantApiClient {
  private client: AxiosInstance;
  private accessToken: string | null = null;

  constructor(config: TenantApiConfig) {
    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // 請求攔截器：自動添加 token
    this.client.interceptors.request.use(
      (config) => {
        if (this.accessToken) {
          config.headers.Authorization = `Bearer ${this.accessToken}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // 響應攔截器：處理錯誤
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Token 過期，清除本地存儲
          this.clearToken();
        }
        return Promise.reject(error);
      }
    );
  }

  setAccessToken(token: string | null) {
    this.accessToken = token;
    if (token) {
      localStorage.setItem('tenant_access_token', token);
    } else {
      localStorage.removeItem('tenant_access_token');
    }
  }

  getAccessToken(): string | null {
    if (!this.accessToken) {
      this.accessToken = localStorage.getItem('tenant_access_token');
    }
    return this.accessToken;
  }

  clearToken() {
    this.accessToken = null;
    localStorage.removeItem('tenant_access_token');
    localStorage.removeItem('tenant_refresh_token');
  }

  setRefreshToken(token: string) {
    localStorage.setItem('tenant_refresh_token', token);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('tenant_refresh_token');
  }

  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await this.client.post<AuthResponse>(
      '/api/auth/login',
      credentials
    );
    const data = response.data;
    this.setAccessToken(data.accessToken);
    this.setRefreshToken(data.refreshToken);
    return data;
  }

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    const response = await this.client.post<AuthResponse>(
      '/api/auth/refresh',
      { refreshToken }
    );
    const data = response.data;
    this.setAccessToken(data.accessToken);
    this.setRefreshToken(data.refreshToken);
    return data;
  }

  async logout(refreshToken?: string): Promise<void> {
    try {
      await this.client.post('/api/auth/logout', { refreshToken });
    } catch (error) {
      // 即使登出失敗也清除本地 token
      console.error('Logout error:', error);
    } finally {
      this.clearToken();
    }
  }

  async getMe(): Promise<UserInfo> {
    const response = await this.client.post<UserInfo>('/api/auth/me', {});
    return response.data;
  }

  // 通用請求方法
  async request<T = any>(config: AxiosRequestConfig): Promise<T> {
    const response = await this.client.request<T>(config);
    return response.data;
  }
}

// 創建單例實例
let tenantApiClientInstance: TenantApiClient | null = null;

export function createTenantApiClient(
  baseURL: string = import.meta.env.VITE_TENANT_API_URL || 'http://localhost:4000'
): TenantApiClient {
  if (!tenantApiClientInstance) {
    tenantApiClientInstance = new TenantApiClient({ baseURL });
    // 從 localStorage 恢復 token
    const savedToken = localStorage.getItem('tenant_access_token');
    if (savedToken) {
      tenantApiClientInstance.setAccessToken(savedToken);
    }
  }
  return tenantApiClientInstance;
}

export function getTenantApiClient(): TenantApiClient {
  if (!tenantApiClientInstance) {
    return createTenantApiClient();
  }
  return tenantApiClientInstance;
}
