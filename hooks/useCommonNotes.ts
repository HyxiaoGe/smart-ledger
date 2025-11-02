/* eslint-disable */
import { useCallback, useEffect, useRef, useState } from 'react';
import { readJSON, writeJSON, removeItem } from '@/lib/utils/storage';
import { commonNotesService, type CommonNote } from '@/lib/services/commonNotes';

export const COMMON_NOTES_CACHE_KEY = 'common-notes-cache';
const CACHE_TTL = 24 * 60 * 60 * 1000;

type UseCommonNotesResult = {
  localCache: CommonNote[];
  isLoading: boolean;
  ensureFreshList: () => Promise<void>;
  searchRemote: (keyword: string) => Promise<CommonNote[]>;
  updateLocalCache: (notes: CommonNote[]) => void;
};

type CachePayload = { data: CommonNote[]; timestamp: number };

export function useCommonNotes(): UseCommonNotesResult {
  const [localCache, setLocalCache] = useState<CommonNote[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const needsRemoteFetchRef = useRef(true);
  const listControllerRef = useRef<AbortController | null>(null);
  const searchControllerRef = useRef<AbortController | null>(null);

  const primeFromStorage = useCallback(() => {
    const cached = readJSON<CachePayload | null>(COMMON_NOTES_CACHE_KEY, null);
    if (!cached) {
      needsRemoteFetchRef.current = true;
      return;
    }

    if (Date.now() - cached.timestamp > CACHE_TTL) {
      needsRemoteFetchRef.current = true;
      return;
    }

    setLocalCache(cached.data);
    needsRemoteFetchRef.current = false;
  }, []);

  useEffect(() => {
    primeFromStorage();
    return () => {
      listControllerRef.current?.abort();
      searchControllerRef.current?.abort();
    };
  }, [primeFromStorage]);

  const fetchRemoteList = useCallback(async () => {
    setIsLoading(true);
    listControllerRef.current?.abort();
    const controller = new AbortController();
    listControllerRef.current = controller;

    try {
      const { data } = await commonNotesService.list({ signal: controller.signal });
      setLocalCache(data);
      writeJSON<CachePayload>(COMMON_NOTES_CACHE_KEY, { data, timestamp: Date.now() });
      needsRemoteFetchRef.current = false;
    } catch (error: any) {
      if (error?.name !== 'AbortError') {
        needsRemoteFetchRef.current = true;
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const ensureFreshList = useCallback(async () => {
    if (needsRemoteFetchRef.current && !isLoading) {
      await fetchRemoteList();
    }
  }, [fetchRemoteList, isLoading]);

  const searchRemote = useCallback(async (keyword: string) => {
    if (!keyword.trim()) return [];

    searchControllerRef.current?.abort();
    const controller = new AbortController();
    searchControllerRef.current = controller;

    try {
      const { data } = await commonNotesService.search({
        keyword,
        signal: controller.signal
      });
      return data;
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        return [];
      }
      return [];
    }
  }, []);

  const updateLocalCache = useCallback((notes: CommonNote[]) => {
    setLocalCache(notes);
    writeJSON<CachePayload>(COMMON_NOTES_CACHE_KEY, { data: notes, timestamp: Date.now() });
    needsRemoteFetchRef.current = false;
  }, []);

  return {
    localCache,
    isLoading,
    ensureFreshList,
    searchRemote,
    updateLocalCache
  };
}

export function invalidateCommonNotesCache() {
  removeItem(COMMON_NOTES_CACHE_KEY);
}
