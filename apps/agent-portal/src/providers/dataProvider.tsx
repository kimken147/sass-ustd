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

      const response = await client.request({
        method: "GET",
        url: `/api/${resource}`,
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

      // customers 資源返回 { customers, total, stats, ... } 格式
      if (resource === "customers" && responseData.customers) {
        return {
          data: responseData, // 返回完整響應，包含 customers, stats 等
          total: responseData.total || 0,
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
      const response = await client.request({
        method: "GET",
        url: `/api/${resource}/${id}`,
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
      const response = await client.request({
        method: "POST",
        url: `/api/${resource}`,
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
      const response = await client.request({
        method: "PATCH",
        url: `/api/${resource}/${id}`,
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
