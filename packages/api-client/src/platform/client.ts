import axios, { AxiosInstance, AxiosRequestConfig } from "axios";

export interface PlatformApiConfig {
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
}

export class PlatformApiClient {
  private client: AxiosInstance;
  private accessToken: string | null = null;

  constructor(config: PlatformApiConfig) {
    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 10000,
      headers: {
        "Content-Type": "application/json",
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
      localStorage.setItem("platform_access_token", token);
    } else {
      localStorage.removeItem("platform_access_token");
    }
  }

  getAccessToken(): string | null {
    if (!this.accessToken) {
      this.accessToken = localStorage.getItem("platform_access_token");
    }
    return this.accessToken;
  }

  clearToken() {
    this.accessToken = null;
    localStorage.removeItem("platform_access_token");
    localStorage.removeItem("platform_refresh_token");
  }

  setRefreshToken(token: string) {
    localStorage.setItem("platform_refresh_token", token);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem("platform_refresh_token");
  }

  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await this.client.post<{
      success: boolean;
      data: AuthResponse;
      timestamp: string;
    }>("/api/auth/login", credentials);
    // TransformInterceptor 會包裝響應為 { success, data, timestamp }
    const authData = response.data.data;
    this.setAccessToken(authData.accessToken);
    this.setRefreshToken(authData.refreshToken);
    return authData;
  }

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    const response = await this.client.post<{
      success: boolean;
      data: AuthResponse;
      timestamp: string;
    }>("/api/auth/refresh", { refreshToken });
    // TransformInterceptor 會包裝響應為 { success, data, timestamp }
    const authData = response.data.data;
    this.setAccessToken(authData.accessToken);
    this.setRefreshToken(authData.refreshToken);
    return authData;
  }

  async logout(refreshToken?: string): Promise<void> {
    try {
      await this.client.post("/api/auth/logout", { refreshToken });
    } catch (error) {
      // 即使登出失敗也清除本地 token
      console.error("Logout error:", error);
    } finally {
      this.clearToken();
    }
  }

  async getMe(): Promise<UserInfo> {
    const response = await this.client.get<{
      success: boolean;
      data: UserInfo;
      timestamp: string;
    }>("/api/auth/me");
    // TransformInterceptor 會包裝響應為 { success, data, timestamp }
    return response.data.data;
  }

  // 通用請求方法
  async request<T = any>(config: AxiosRequestConfig): Promise<T> {
    const response = await this.client.request<T>(config);
    return response.data;
  }
}

// 創建單例實例
let platformApiClientInstance: PlatformApiClient | null = null;

export function createPlatformApiClient(
  baseURL: string = import.meta.env.VITE_PLATFORM_API_URL ||
    "http://localhost:3000"
): PlatformApiClient {
  if (!platformApiClientInstance) {
    platformApiClientInstance = new PlatformApiClient({ baseURL });
    // 從 localStorage 恢復 token
    const savedToken = localStorage.getItem("platform_access_token");
    if (savedToken) {
      platformApiClientInstance.setAccessToken(savedToken);
    }
  }
  return platformApiClientInstance;
}

export function getPlatformApiClient(): PlatformApiClient {
  if (!platformApiClientInstance) {
    return createPlatformApiClient();
  }
  return platformApiClientInstance;
}
