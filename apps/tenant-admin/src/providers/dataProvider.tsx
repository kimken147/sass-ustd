import { DataProvider, type HttpError } from "@refinedev/core";
import { getTenantApiClient } from "@saas-platform/api-client";

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
    const client = getTenantApiClient();
    const { currentPage = 1, pageSize = 10 } = pagination ?? {};

    try {
      // 构建查询参数
      const params: Record<string, any> = {
        page: currentPage,
        limit: pageSize,
      };

      // 添加排序
      if (sorters && sorters.length > 0) {
        const sorter = sorters[0];
        params.sort = `${sorter.field}:${sorter.order}`;
      }

      // 添加筛选（同时处理分页和日期筛选）
      if (filters && filters.length > 0) {
        filters.forEach((filter) => {
          if ("field" in filter && "value" in filter) {
            // 特殊处理分页参数：如果 filters 中有 page 或 limit，覆盖默认值
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
      // 需要取出 data 属性作为实际数据
      const responseData = response.data || response;

      // 有些 endpoints 会直接回传阵列
      if (Array.isArray(responseData)) {
        return {
          data: responseData,
          total: responseData.length,
        };
      }

      // 特殊处理 customers 资源：它返回 { customers, total, stats, ... } 格式
      if (resource === "customers" && responseData.customers) {
        return {
          data: responseData.customers,
          total: responseData.total || 0,
          // 保留额外的 stats 信息在 meta 中
          meta: {
            stats: responseData.stats,
          },
        };
      }

      // 标准格式：{ data: [...], total: ... } 或直接是数组
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
    const client = getTenantApiClient();

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
    const client = getTenantApiClient();

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
    const client = getTenantApiClient();

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
      throw createHttpError(errorMessage, statusCode);
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
      throw createHttpError(errorMessage, statusCode);
    }
  },

  getApiUrl: () => {
    return import.meta.env.VITE_TENANT_API_URL || "http://localhost:3001";
  },
};
