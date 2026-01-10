import { DataProvider } from "@refinedev/core";
import { getTenantApiClient } from "@saas-platform/api-client";

export const dataProvider: DataProvider = {
  getList: async ({ resource, pagination, filters, sorters }) => {
    const client = getTenantApiClient();

    try {
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
        url: `/${resource}`,
        params,
      });

      // 統一處理返回格式：支持 { data, total } 或直接是 { data, total } 結構
      return {
        data: response.data || response.items || [],
        total:
          response.total ||
          response.count ||
          (Array.isArray(response.data) ? response.data.length : 0),
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
        url: `/${resource}/${id}`,
      });

      return {
        data: response.data || response,
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
      const response = await client.request({
        method: "POST",
        url: `/${resource}`,
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
      const response = await client.request({
        method: "PATCH",
        url: `/${resource}/${id}`,
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
      const response = await client.request({
        method: "DELETE",
        url: `/${resource}/${id}`,
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
