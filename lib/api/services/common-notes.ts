/**
 * 常用备注 API 服务
 */

import { apiClient, buildQueryString } from '../client';
import type { CommonNote } from '@/types/domain/transaction';

/**
 * 常用备注列表参数
 */
export interface CommonNoteListParams {
  limit?: number;
  search?: string;
}

/**
 * 创建/更新常用备注参数
 */
export interface UpsertCommonNoteParams {
  content: string;
  amount?: number;
}

/**
 * 常用备注 API 服务
 */
export const commonNotesApi = {
  /**
   * 获取常用备注列表
   */
  list(params?: CommonNoteListParams): Promise<CommonNote[]> {
    const query = buildQueryString(params || {});
    return apiClient.get<CommonNote[]>(`/api/common-notes${query}`);
  },

  /**
   * 搜索常用备注
   */
  search(keyword: string, limit: number = 6): Promise<CommonNote[]> {
    const query = buildQueryString({ search: keyword, limit });
    return apiClient.get<CommonNote[]>(`/api/common-notes${query}`);
  },

  /**
   * 创建或更新常用备注
   */
  upsert(data: UpsertCommonNoteParams): Promise<CommonNote> {
    return apiClient.post<CommonNote>('/api/common-notes', data);
  },
};
