'use client';

import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/api/queryClient';
import { aiApi } from '@/lib/api/services/ai';
import { enhancedDataSync, markTransactionsDirty } from '@/lib/core/EnhancedDataSync';
import { STORAGE_KEYS } from '@/lib/config/storageKeys';

type TransactionWriteAction = 'create' | 'update' | 'delete' | 'restore';

type ApplyTransactionWriteEffectsParams = {
  action: TransactionWriteAction;
  queryClient?: QueryClient;
  transactionId?: string;
  payload?: unknown;
  clearCommonNotesCache?: boolean;
  revalidateServer?: boolean;
};

function hasTransactionId(payload: unknown, transactionId?: string): boolean {
  if (!payload || typeof payload !== 'object') return false;
  return 'id' in payload && typeof (payload as { id?: unknown }).id === 'string'
    && (!transactionId || (payload as { id: string }).id === transactionId);
}

function invalidateTransactionQueries(queryClient?: QueryClient) {
  if (!queryClient) return;

  void queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all });
  void queryClient.invalidateQueries({ queryKey: queryKeys.transactions.recent() });
  void queryClient.invalidateQueries({ queryKey: queryKeys.transactions.frequentAmountsAll() });
}

function invalidateCommonNoteQueries(queryClient?: QueryClient) {
  if (!queryClient) return;
  void queryClient.invalidateQueries({ queryKey: queryKeys.commonNotes.all });
}

function clearCommonNotesLocalCache() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEYS.COMMON_NOTES_CACHE);
}

function notifyTransactionEvent(action: TransactionWriteAction, payload?: unknown) {
  if (action === 'update') {
    enhancedDataSync.notifyTransactionUpdated(payload, true);
    return;
  }

  if (action === 'delete') {
    enhancedDataSync.notifyTransactionDeleted(payload, true);
    return;
  }

  enhancedDataSync.notifyTransactionAdded(payload, true);
}

function syncTransactionDetailCache(params: {
  action: TransactionWriteAction;
  queryClient?: QueryClient;
  transactionId?: string;
  payload?: unknown;
}) {
  const { action, queryClient, transactionId, payload } = params;
  if (!queryClient || !transactionId) return;

  if (action === 'delete') {
    void queryClient.removeQueries({ queryKey: queryKeys.transactions.detail(transactionId) });
    return;
  }

  if ((action === 'update' || action === 'restore') && hasTransactionId(payload, transactionId)) {
    queryClient.setQueryData(queryKeys.transactions.detail(transactionId), payload);
  }
}

export function applyTransactionWriteEffects(params: ApplyTransactionWriteEffectsParams): void {
  const {
    action,
    queryClient,
    transactionId,
    payload,
    clearCommonNotesCache = false,
    revalidateServer = false,
  } = params;

  syncTransactionDetailCache({ action, queryClient, transactionId, payload });
  invalidateTransactionQueries(queryClient);
  notifyTransactionEvent(action, payload ?? (transactionId ? { id: transactionId } : undefined));
  markTransactionsDirty();

  if (clearCommonNotesCache) {
    clearCommonNotesLocalCache();
    invalidateCommonNoteQueries(queryClient);
  }

  if (revalidateServer) {
    void aiApi.revalidate('transactions').catch((error) => {
      console.error('缓存刷新失败:', error);
    });
  }
}
