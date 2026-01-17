import { DataProvider, type HttpError } from "@refinedev/core";
import { getPlatformApiClient } from "@saas-platform/api-client";

// 創建符合 Refine HttpError 接口的普通對象
// 使用普通對象而非 Error 子類，確保 statusCode 屬性能被 Refine 正確讀取
function createHttpError(
  message: string,
  statusCode: number,
  errors?: Record<string, any>
): HttpError {
  return {
    message,
    statusCode,
    name: "HttpError",
    errors,
  };
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

      // client.request 返回 axios response.data，即 { success, data, timestamp }
      // 需要取出 data 属性作为实际数据
      const responseData = response.data || response;

      // 有些 endpoints 会直接回传数组
      if (Array.isArray(responseData)) {
        return {
          data: responseData,
          total: responseData.length,
        };
      }

      // 特殊处理 sites 资源：它返回 { totalStats, sites, total, page, limit, totalPages }
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

      // 標準格式：{ data: [...], total: ... } 或直接是數組
      return {
        data: responseData.data || responseData.items || responseData,
        total: responseData.total || responseData.count || 0,
      };
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || `Failed to fetch ${resource}`;
      const statusCode = error.response?.status || 500;
      throw createHttpError(errorMessage, statusCode);
    }
  },

  getOne: async ({ resource, id }) => {
    const client = getPlatformApiClient();

    try {
      const response = await client.request({
        method: "GET",
        url: `/api/${resource}/${id}`,
      });

      // client.request 返回 axios response.data，即 { success, data, timestamp }
      // 需要取出 data 属性作为实际数据
      const responseData = response.data || response;

      return {
        data: responseData,
      };
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || `Failed to fetch ${resource}/${id}`;
      const statusCode = error.response?.status || 500;
      throw createHttpError(errorMessage, statusCode);
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

      // client.request 返回 axios response.data，即 { success, data, timestamp }
      // 需要取出 data 属性作为实际数据
      const responseData = response.data || response;

      return {
        data: responseData,
      };
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || `Failed to create ${resource}`;
      const statusCode = error.response?.status || 500;
      throw createHttpError(errorMessage, statusCode);
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

      // client.request 返回 axios response.data，即 { success, data, timestamp }
      // 需要取出 data 属性作为实际数据
      const responseData = response.data || response;

      return {
        data: responseData,
      };
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || `Failed to update ${resource}/${id}`;
      const statusCode = error.response?.status || 500;
      throw createHttpError(errorMessage, statusCode);
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
      throw createHttpError(errorMessage, statusCode);
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
      throw createHttpError(errorMessage, statusCode);
    }
  },

  getApiUrl: () => {
    return import.meta.env.VITE_PLATFORM_API_URL || "http://localhost:3000";
  },
};
