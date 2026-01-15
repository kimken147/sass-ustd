import { DataProvider, type HttpError } from "@refinedev/core";
import { getTenantApiClient } from "@saas-platform/api-client";

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
    const client = getTenantApiClient();
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
            if (filter.field === "page" || filter.field === "limit") {
              params[filter.field] = filter.value;
            } else {
              params[filter.field] = filter.value;
            }
          }
        });
      }

      // 特殊處理 sub-agents 資源：使用正確的 API 端點
      let url = `/api/${resource}`;
      if (resource === "sub-agents") {
        url = "/api/agents/me/subordinates";
      }

      const response = await client.request({
        method: "GET",
        url,
        params,
      });

      // client.request 返回 axios response.data，即 { success, data, timestamp }
      // 需要取出 data 屬性作為實際數據
      const responseData = response.data || response;

      // 有些 endpoints 會直接回傳陣列
      if (Array.isArray(responseData)) {
        return {
          data: responseData,
          total: responseData.length,
        };
      }

      // 特殊處理 customers 資源：它返回 { customers, total, stats, ... } 格式
      if (resource === "customers" && responseData.customers) {
        return {
          data: responseData.customers,
          total: responseData.total || 0,
          // 保留額外的 stats 信息在 meta 中
          meta: {
            stats: responseData.stats,
          },
        };
      }

      // 標準格式：{ data: [...], total: ... } 或直接是數組
      return {
        data: responseData.data || responseData.items || responseData,
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
    const client = getTenantApiClient();

    try {
      // 特殊處理 sub-agents 資源：使用正確的 API 端點
      let url = `/api/${resource}/${id}`;
      if (resource === "sub-agents") {
        url = `/api/agents/me/subordinates/${id}`;
      }

      const response = await client.request({
        method: "GET",
        url,
      });

      // client.request 返回 axios response.data，即 { success, data, timestamp }
      // 需要取出 data 屬性作為實際數據
      const responseData = response.data || response;

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
    const client = getTenantApiClient();

    try {
      // 特殊處理 sub-agents 資源：使用正確的 API 端點
      let url = `/api/${resource}`;
      if (resource === "sub-agents") {
        url = "/api/agents/me/subordinates";
      }

      const response = await client.request({
        method: "POST",
        url,
        data: variables,
      });

      // client.request 返回 axios response.data，即 { success, data, timestamp }
      // 需要取出 data 屬性作為實際數據
      const responseData = response.data || response;

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
    const client = getTenantApiClient();

    try {
      // 特殊處理 sub-agents 資源：使用正確的 API 端點
      let url = `/api/${resource}/${id}`;
      if (resource === "sub-agents") {
        url = `/api/agents/me/subordinates/${id}`;
      }

      const response = await client.request({
        method: "PATCH",
        url,
        data: variables,
      });

      // client.request 返回 axios response.data，即 { success, data, timestamp }
      // 需要取出 data 屬性作為實際數據
      const responseData = response.data || response;

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
    const client = getTenantApiClient();

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
    const client = getTenantApiClient();

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
    return import.meta.env.VITE_TENANT_API_URL || "http://localhost:3001";
  },
};
