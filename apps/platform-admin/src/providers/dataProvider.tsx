import { DataProvider } from '@refinedev/core';
import { getPlatformApiClient } from '@saas-platform/api-client';

export const dataProvider: DataProvider = {
  getList: async ({ resource, pagination, filters, sorters, meta }) => {
    const client = getPlatformApiClient();
    const { current = 1, pageSize = 10 } = pagination ?? {};

    try {
      // 構建查詢參數
      const params: Record<string, any> = {
        page: current,
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
          if ('field' in filter && 'value' in filter) {
            params[filter.field] = filter.value;
          }
        });
      }

      const response = await client.request({
        method: 'GET',
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

  getOne: async ({ resource, id, meta }) => {
    const client = getPlatformApiClient();

    try {
      const response = await client.request({
        method: 'GET',
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

  create: async ({ resource, variables, meta }) => {
    const client = getPlatformApiClient();

    try {
      const response = await client.request({
        method: 'POST',
        url: `/api/${resource}`,
        data: variables,
      });

      return {
        data: response,
      };
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || `Failed to create ${resource}`
      );
    }
  },

  update: async ({ resource, id, variables, meta }) => {
    const client = getPlatformApiClient();

    try {
      const response = await client.request({
        method: 'PATCH',
        url: `/api/${resource}/${id}`,
        data: variables,
      });

      return {
        data: response,
      };
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || `Failed to update ${resource}/${id}`
      );
    }
  },

  deleteOne: async ({ resource, id, meta }) => {
    const client = getPlatformApiClient();

    try {
      await client.request({
        method: 'DELETE',
        url: `/api/${resource}/${id}`,
      });

      return {
        data: { id },
      };
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || `Failed to delete ${resource}/${id}`
      );
    }
  },

  getApiUrl: () => {
    return import.meta.env.VITE_PLATFORM_API_URL || 'http://localhost:3000';
  },
};
