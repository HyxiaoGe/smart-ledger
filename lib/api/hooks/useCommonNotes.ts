'use client';

/**
 * 常用备注相关 React Query Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../queryClient';
import { commonNotesApi, type UpsertCommonNoteParams } from '../services/common-notes';

/**
 * 获取常用备注列表
 */
export function useCommonNotesList(limit: number = 10) {
  return useQuery({
    queryKey: queryKeys.commonNotes.list(limit),
    queryFn: () => commonNotesApi.list({ limit }),
  });
}

/**
 * 搜索常用备注
 */
export function useCommonNotesSearch(keyword: string, limit: number = 6) {
  return useQuery({
    queryKey: queryKeys.commonNotes.search(keyword),
    queryFn: () => commonNotesApi.search(keyword, limit),
    enabled: keyword.length > 0,
    staleTime: 30 * 1000, // 30秒内不重新获取
  });
}

/**
 * 创建或更新常用备注
 */
export function useUpsertCommonNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpsertCommonNoteParams) => commonNotesApi.upsert(data),
    onSuccess: () => {
      // 使所有常用备注缓存失效
      queryClient.invalidateQueries({ queryKey: queryKeys.commonNotes.all });
    },
  });
}
