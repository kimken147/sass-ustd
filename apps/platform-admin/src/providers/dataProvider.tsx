import { DataProvider, type HttpError } from "@refinedev/core";
import { getPlatformApiClient } from "@saas-platform/api-client";

// 自定義 HttpError 類，符合 @refinedev/core 的 HttpError 接口
class HttpErrorImpl extends Error implements HttpError {
  statusCode: number;
  errors?: Record<string, any>;

  constructor(
    message: string,
    statusCode: number,
    errors?: Record<string, any>
  ) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

export const dataProvider: DataProvider = {
  getList: async ({ resource, pagination, filters, sorters }) => {
    const client = getPlatformApiClient();
    const { currentPage = 1, pageSize = 10 } = pagination ?? {};

    try {
      // 構建查詢參數
      const params: Record<string, any> = {
        page: currentPage,
        limit: pageSize,
      };

      // 添加排序
      if (sorters && sorters.length > 0) {
        const sorter = sorters[0];
        params.sort = `${sorter.field}:${sorter.order}`;
      }

      // 添加篩選
      if (filters && filters.length > 0) {
        filters.forEach((filter) => {
          if ("field" in filter && "value" in filter) {
            params[filter.field] = filter.value;
          }
        });
      }

      const response = await client.request({
        method: "GET",
        url: `/api/${resource}`,
        params,
      });

      // 處理標準的 API 回應格式（經過 TransformInterceptor 包裝）
      // TransformInterceptor 會將回應包裝為 { success: true, data: <原始回應>, timestamp: "..." }
      const wrappedData = response.data || response;
      const responseData = wrappedData.data || wrappedData;

      // 有些 endpoints 會直接回傳陣列（例如 TransformInterceptor 包裝後的 data: []）
      // 此時 responseData 會是 Array，而不是 { data: [...] }
      if (Array.isArray(responseData)) {
        return {
          data: responseData,
          total: responseData.length,
        };
      }

      // 特殊處理 sites 資源：它返回 { totalStats, sites, total, page, limit, totalPages }
      if (resource === "sites" && responseData.sites) {
        return {
          data: responseData.sites,
          total: responseData.total || 0,
          // 保留額外的 totalStats 信息在 meta 中
          meta: {
            totalStats: responseData.totalStats,
          },
        };
      }

      // 標準格式：{ data: [...], total: ... }
      return {
        data: responseData.data || responseData.items || [],
        total: responseData.total || responseData.count || 0,
      };
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || `Failed to fetch ${resource}`;
      const statusCode = error.response?.status || 500;
      throw new HttpErrorImpl(errorMessage, statusCode);
    }
  },

  getOne: async ({ resource, id }) => {
    const client = getPlatformApiClient();

    try {
      const response = await client.request({
        method: "GET",
        url: `/api/${resource}/${id}`,
      });

      // 處理標準的 API 回應格式（經過 TransformInterceptor 包裝）
      const wrappedData = response.data || response;
      const responseData = wrappedData.data || wrappedData;

      return {
        data: responseData,
      };
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || `Failed to fetch ${resource}/${id}`;
      const statusCode = error.response?.status || 500;
      throw new HttpErrorImpl(errorMessage, statusCode);
    }
  },

  create: async ({ resource, variables }) => {
    const client = getPlatformApiClient();

    try {
      const response = await client.request({
        method: "POST",
        url: `/api/${resource}`,
        data: variables,
      });

      // 處理標準的 API 回應格式（經過 TransformInterceptor 包裝）
      const wrappedData = response.data || response;
      const responseData = wrappedData.data || wrappedData;

      return {
        data: responseData,
      };
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || `Failed to create ${resource}`;
      const statusCode = error.response?.status || 500;
      throw new HttpErrorImpl(errorMessage, statusCode);
    }
  },

  update: async ({ resource, id, variables }) => {
    const client = getPlatformApiClient();

    try {
      const response = await client.request({
        method: "PATCH",
        url: `/api/${resource}/${id}`,
        data: variables,
      });

      // 處理標準的 API 回應格式（經過 TransformInterceptor 包裝）
      const wrappedData = response.data || response;
      const responseData = wrappedData.data || wrappedData;

      return {
        data: responseData,
      };
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || `Failed to update ${resource}/${id}`;
      const statusCode = error.response?.status || 500;
      throw new HttpErrorImpl(errorMessage, statusCode);
    }
  },

  deleteOne: async (params) => {
    const { resource, id } = params;
    const client = getPlatformApiClient();

    try {
      const response = await client.request({
        method: "DELETE",
        url: `/api/${resource}/${id}`,
      });

      return {
        data: (response?.data || { id }) as any,
      };
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || `Failed to delete ${resource}/${id}`;
      const statusCode = error.response?.status || 500;
      throw new HttpErrorImpl(errorMessage, statusCode);
    }
  },

  custom: async ({ url, method, payload, query, headers }) => {
    const client = getPlatformApiClient();

    try {
      const response = await client.request({
        method: (method?.toUpperCase() as any) || "GET",
        url,
        data: payload,
        params: query,
        headers,
      });

      return {
        data: response,
      };
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || `Failed to ${method} ${url}`;
      const statusCode = error.response?.status || 500;
      throw new HttpErrorImpl(errorMessage, statusCode);
    }
  },

  getApiUrl: () => {
    return import.meta.env.VITE_PLATFORM_API_URL || "http://localhost:3000";
  },
};
