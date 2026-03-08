'use client';

/**
 * 交易相关 React Query Hooks
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { queryKeys } from '../queryClient';
import {
  transactionsApi,
  type TransactionListParams,
  type CreateTransactionParams,
  type UpdateTransactionParams,
} from '../services/transactions';
import { applyTransactionWriteEffects } from '../transactionWriteEffects';
import type { Transaction } from '@/types/domain/transaction';
import {
  formatDateToLocal,
  getExtendedQuickRange,
  getMonthRangeFromString,
  parseLocalDate,
} from '@/lib/utils/date';

type MutationCallbacks<TData, TVariables> = Pick<
  UseMutationOptions<TData, Error, TVariables>,
  'onSuccess' | 'onError'
>;

type TransactionWriteEffectOptions = {
  clearCommonNotesCache?: boolean;
  revalidateServer?: boolean;
};

type CreateTransactionHookOptions = MutationCallbacks<Transaction, CreateTransactionParams> & {
  effectOptions?: TransactionWriteEffectOptions;
};

type TransactionRowsQueryOptions = Omit<
  UseQueryOptions<Transaction[], Error, Transaction[], readonly unknown[]>,
  'queryKey' | 'queryFn'
> & {
  queryKey?: readonly unknown[];
};

type TransactionRowsRangeOverrides = Omit<
  TransactionListParams,
  'month' | 'range' | 'startDate' | 'endDate' | 'start_date' | 'end_date'
>;

type TransactionRangeKey = Parameters<typeof getExtendedQuickRange>[0];

export function resolveTransactionListRangeParams(params?: {
  month?: string;
  range?: TransactionRangeKey | string;
  start?: string;
  end?: string;
  overrides?: TransactionRowsRangeOverrides;
}): TransactionListParams | undefined {
  if (!params) return params;

  const { month, range, start, end, overrides } = params;

  if (start && end) {
    return {
      start_date: start,
      end_date: end,
      ...overrides,
    };
  }

  if (month) {
    return buildMonthlyTransactionRowsParams(month, overrides);
  }

  return {
    ...getExtendedQuickRange((range as TransactionRangeKey) || 'today'),
    ...overrides,
  };
}

export function buildMonthlyTransactionRowsParams(
  month?: string,
  overrides?: TransactionRowsRangeOverrides
): TransactionListParams {
  const { start, end } = getMonthRangeFromString(month);

  return {
    start_date: start,
    end_date: end,
    ...overrides,
  };
}

export function buildDailyTransactionRowsParams(
  date: string | Date = new Date(),
  overrides?: TransactionRowsRangeOverrides
): TransactionListParams {
  const parsedDate =
    date instanceof Date ? date : parseLocalDate(date) ?? new Date(date);
  const safeDate = Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
  const day = formatDateToLocal(safeDate);

  return {
    start_date: day,
    end_date: day,
    ...overrides,
  };
}

export function createTransactionRowsQueryOptions(
  params?: TransactionListParams,
  options?: TransactionRowsQueryOptions
) {
  return {
    queryKey: options?.queryKey ?? queryKeys.transactions.list(params),
    queryFn: () => transactionsApi.listRows(params),
    ...options,
  };
}

export function fetchTransactionRows(params?: TransactionListParams) {
  return transactionsApi.listRows(params);
}

export async function fetchAllTransactionRows(
  params?: TransactionListParams,
  options?: { pageSize?: number }
) {
  const pageSize = options?.pageSize ?? 100;
  const rows: Transaction[] = [];
  let page = 1;

  while (true) {
    const currentRows = await fetchTransactionRows({
      ...params,
      page,
      page_size: pageSize,
    });
    rows.push(...currentRows);

    if (currentRows.length < pageSize) {
      break;
    }

    page += 1;
  }

  return rows;
}

export function createMonthlyTransactionRowsQueryOptions(
  month?: string,
  params?: TransactionRowsRangeOverrides,
  options?: TransactionRowsQueryOptions
) {
  return createTransactionRowsQueryOptions(
    buildMonthlyTransactionRowsParams(month, params),
    options
  );
}

export function fetchMonthlyTransactionRows(
  month?: string,
  params?: TransactionRowsRangeOverrides
) {
  return fetchTransactionRows(buildMonthlyTransactionRowsParams(month, params));
}

export function fetchAllMonthlyTransactionRows(
  month?: string,
  params?: TransactionRowsRangeOverrides,
  options?: { pageSize?: number }
) {
  return fetchAllTransactionRows(buildMonthlyTransactionRowsParams(month, params), options);
}

export function useMonthlyTransactionRowsQuery(
  month?: string,
  params?: TransactionRowsRangeOverrides,
  options?: TransactionRowsQueryOptions
) {
  return useQuery(createMonthlyTransactionRowsQueryOptions(month, params, options));
}

export function useAllMonthlyTransactionRowsQuery(
  month?: string,
  params?: TransactionRowsRangeOverrides,
  options?: TransactionRowsQueryOptions & { pageSize?: number }
) {
  return useAllTransactionRowsQuery(buildMonthlyTransactionRowsParams(month, params), options);
}

export function createAllMonthlyTransactionRowsQueryOptions(
  month?: string,
  params?: TransactionRowsRangeOverrides,
  options?: TransactionRowsQueryOptions & { pageSize?: number }
) {
  return {
    queryKey:
      options?.queryKey ??
      ['transactions', 'list', 'all', 'month', month ?? 'current', params, options?.pageSize ?? 100],
    queryFn: () => fetchAllMonthlyTransactionRows(month, params, { pageSize: options?.pageSize }),
    ...options,
  };
}

export function createDailyTransactionRowsQueryOptions(
  date?: string | Date,
  params?: TransactionRowsRangeOverrides,
  options?: TransactionRowsQueryOptions
) {
  return createTransactionRowsQueryOptions(
    buildDailyTransactionRowsParams(date, params),
    options
  );
}

export function fetchDailyTransactionRows(
  date?: string | Date,
  params?: TransactionRowsRangeOverrides
) {
  return fetchTransactionRows(buildDailyTransactionRowsParams(date, params));
}

export function useDailyTransactionRowsQuery(
  date?: string | Date,
  params?: TransactionRowsRangeOverrides,
  options?: TransactionRowsQueryOptions
) {
  return useQuery(createDailyTransactionRowsQueryOptions(date, params, options));
}

/**
 * 获取交易列表
 */
export function useTransactions(params?: TransactionListParams) {
  return useQuery({
    queryKey: queryKeys.transactions.list(params),
    queryFn: () => transactionsApi.list(params),
  });
}

export function useTransactionRowsQuery(
  params?: TransactionListParams,
  options?: TransactionRowsQueryOptions
) {
  return useQuery(createTransactionRowsQueryOptions(params, options));
}

export function useAllTransactionRowsQuery(
  params?: TransactionListParams,
  options?: TransactionRowsQueryOptions & { pageSize?: number }
) {
  const { pageSize, ...queryOptions } = options || {};

  return useQuery({
    queryKey: queryOptions.queryKey ?? ['transactions', 'list', 'all', params, pageSize ?? 100],
    queryFn: () => fetchAllTransactionRows(params, { pageSize }),
    ...queryOptions,
  });
}

export function usePaginatedTransactionRows(
  baseParams?: TransactionListParams,
  options?: TransactionRowsQueryOptions & {
    pageSize?: number;
  }
) {
  const { pageSize: optionPageSize, ...queryOptions } = options || {};
  const pageSize = optionPageSize ?? baseParams?.page_size ?? 50;
  const [page, setPage] = useState(1);
  const [allRows, setAllRows] = useState<Transaction[]>([]);
  const baseParamsKey = JSON.stringify(baseParams || {});

  const queryParams = useMemo(
    () => ({
      ...baseParams,
      page,
      page_size: pageSize,
    }),
    [baseParams, page, pageSize]
  );

  const query = useTransactionRowsQuery(queryParams, queryOptions);

  useEffect(() => {
    setPage(1);
    setAllRows([]);
  }, [baseParamsKey]);

  useEffect(() => {
    const currentRows = query.data || [];
    if (page === 1) {
      setAllRows(currentRows);
      return;
    }
    if (currentRows.length > 0) {
      setAllRows((prev) => [...prev, ...currentRows]);
    }
  }, [query.data, page]);

  const hasMore = (query.data || []).length >= pageSize;

  const loadMore = useCallback(() => {
    if (query.isFetching || !hasMore) return;
    setPage((prev) => prev + 1);
  }, [hasMore, query.isFetching]);

  const reset = useCallback(() => {
    setPage(1);
    setAllRows([]);
  }, []);

  return {
    ...query,
    data: allRows,
    page,
    hasMore,
    loadMore,
    reset,
  };
}

/**
 * 获取单个交易
 */
export function useTransaction(id: string) {
  return useQuery({
    queryKey: queryKeys.transactions.detail(id),
    queryFn: () => transactionsApi.get(id),
    enabled: !!id,
  });
}

/**
 * 获取今日自动生成的交易
 */
export function useTodayAutoGeneratedTransactions() {
  return useQuery({
    queryKey: queryKeys.transactions.todayAutoGenerated(),
    queryFn: () => transactionsApi.getTodayAutoGenerated(),
  });
}

/**
 * 创建交易
 */
export function useCreateTransaction(
  options?: CreateTransactionHookOptions
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTransactionParams) => transactionsApi.create(data),
    onSuccess: (newTransaction, variables, onMutateResult, context) => {
      applyTransactionWriteEffects({
        action: 'create',
        queryClient,
        transactionId: newTransaction.id,
        payload: newTransaction,
        clearCommonNotesCache:
          options?.effectOptions?.clearCommonNotesCache ?? Boolean(newTransaction.note?.trim()),
        revalidateServer: options?.effectOptions?.revalidateServer ?? false,
      });
      options?.onSuccess?.(newTransaction, variables, onMutateResult, context);
    },
    onError: options?.onError,
  });
}

/**
 * 更新交易
 */
export function useUpdateTransaction(
  options?: MutationCallbacks<Transaction, UpdateTransactionParams>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateTransactionParams) => transactionsApi.update(data),
    onSuccess: (updatedTransaction, variables, onMutateResult, context) => {
      applyTransactionWriteEffects({
        action: 'update',
        queryClient,
        transactionId: variables.id,
        payload: updatedTransaction,
      });
      options?.onSuccess?.(updatedTransaction, variables, onMutateResult, context);
    },
    onError: options?.onError,
  });
}

/**
 * 删除交易
 */
export function useDeleteTransaction(
  options?: MutationCallbacks<void, string>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => transactionsApi.delete(id),
    onSuccess: (_, id, onMutateResult, context) => {
      applyTransactionWriteEffects({
        action: 'delete',
        queryClient,
        transactionId: id,
      });
      options?.onSuccess?.(undefined, id, onMutateResult, context);
    },
    onError: options?.onError,
  });
}

/**
 * 恢复已删除的交易
 */
export function useRestoreTransaction(
  options?: MutationCallbacks<Transaction, string>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => transactionsApi.restore(id),
    onSuccess: (restoredTransaction, id, onMutateResult, context) => {
      applyTransactionWriteEffects({
        action: 'restore',
        queryClient,
        transactionId: id,
        payload: restoredTransaction,
      });
      options?.onSuccess?.(restoredTransaction, id, onMutateResult, context);
    },
    onError: options?.onError,
  });
}
