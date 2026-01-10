import { DataProvider } from "@refinedev/core";
import { getTenantApiClient } from "@saas-platform/api-client";

export const dataProvider: DataProvider = {
  getList: async ({ resource, pagination, filters, sorters }) => {
    const client = getTenantApiClient();

    try {
      // revenue-wallets 特殊處理：不使用 /api 前綴，直接返回數組
      if (resource === "revenue-wallets") {
        const response = await client.request({
          method: "GET",
          url: `/revenue-wallets`,
        });

        // API 直接返回數組
        const data = Array.isArray(response) ? response : response.data || [];
        return {
          data,
          total: data.length,
        };
      }

      // 其他資源使用標準格式
      const { currentPage = 1, pageSize = 10 } = pagination ?? {};
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

      return {
        data: response.data || response.items || [],
        total: response.total || response.count || 0,
      };
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || `Failed to fetch ${resource}`
      );
    }
  },

  getOne: async ({ resource, id }) => {
    const client = getTenantApiClient();

    try {
      const response = await client.request({
        method: "GET",
        url: `/api/${resource}/${id}`,
      });

      return {
        data: response,
      };
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || `Failed to fetch ${resource}/${id}`
      );
    }
  },

  create: async ({ resource, variables }) => {
    const client = getTenantApiClient();

    try {
      // revenue-wallets 特殊處理：不使用 /api 前綴
      const url = resource === "revenue-wallets" ? `/${resource}` : `/api/${resource}`;

      const response = await client.request({
        method: "POST",
        url,
        data: variables,
      });

      return {
        data: response.data || response,
      };
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || `Failed to create ${resource}`
      );
    }
  },

  update: async ({ resource, id, variables }) => {
    const client = getTenantApiClient();

    try {
      // revenue-wallets 特殊處理：使用 PUT 而不是 PATCH，不使用 /api 前綴
      const url = resource === "revenue-wallets" ? `/${resource}/${id}` : `/api/${resource}/${id}`;
      const method = resource === "revenue-wallets" ? "PUT" : "PATCH";

      const response = await client.request({
        method: method as any,
        url,
        data: variables,
      });

      return {
        data: response.data || response,
      };
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || `Failed to update ${resource}/${id}`
      );
    }
  },

  deleteOne: async (params) => {
    const { resource, id } = params;
    const client = getTenantApiClient();

    try {
      // revenue-wallets 特殊處理：不使用 /api 前綴
      const url = resource === "revenue-wallets" ? `/${resource}/${id}` : `/api/${resource}/${id}`;

      const response = await client.request({
        method: "DELETE",
        url,
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
      throw new Error(
        error.response?.data?.message || `Failed to ${method} ${url}`
      );
    }
  },

  getApiUrl: () => {
    return import.meta.env.VITE_TENANT_API_URL || "http://localhost:4000";
  },
};
