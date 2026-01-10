import { DataProvider } from "@refinedev/core";
import { getPlatformApiClient } from "@saas-platform/api-client";

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
      throw new Error(
        error.response?.data?.message || `Failed to fetch ${resource}`
      );
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
      throw new Error(
        error.response?.data?.message || `Failed to fetch ${resource}/${id}`
      );
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
      throw new Error(
        error.response?.data?.message || `Failed to create ${resource}`
      );
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
      throw new Error(
        error.response?.data?.message || `Failed to update ${resource}/${id}`
      );
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
      throw new Error(
        error.response?.data?.message || `Failed to delete ${resource}/${id}`
      );
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
      throw new Error(
        error.response?.data?.message || `Failed to ${method} ${url}`
      );
    }
  },

  getApiUrl: () => {
    return import.meta.env.VITE_PLATFORM_API_URL || "http://localhost:3000";
  },
};
