import { useCallback, useEffect, useRef, useState } from 'react';

type UseRefreshQueueParams = {
  delays?: number[];
  refresh: () => void;
  peekDirty: () => boolean;
  consumeDirty: () => void;
};

type StopOptions = {
  consume?: boolean;
};

export function useRefreshQueue({
  delays = [1500, 3500, 6000],
  refresh,
  peekDirty,
  consumeDirty
}: UseRefreshQueueParams) {
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshIndex = useRef(0);
  const queueActive = useRef(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const clearTimer = useCallback(() => {
    if (refreshTimer.current) {
      clearTimeout(refreshTimer.current);
      refreshTimer.current = null;
    }
  }, []);

  const stopQueue = useCallback(
    ({ consume }: StopOptions = {}) => {
      clearTimer();
      queueActive.current = false;
      refreshIndex.current = 0;
      setIsRefreshing(false);
      if (consume) {
        consumeDirty();
      }
    },
    [clearTimer, consumeDirty]
  );

  const scheduleNext = useCallback(() => {
    if (!queueActive.current) return;
    if (refreshIndex.current >= delays.length) {
      stopQueue();
      return;
    }

    const delay = delays[refreshIndex.current];
    clearTimer();
    refreshTimer.current = setTimeout(() => {
      if (!queueActive.current) return;
      refresh();
      refreshIndex.current += 1;
      scheduleNext();
    }, delay);
  }, [clearTimer, delays, refresh, stopQueue]);

  const startQueue = useCallback(() => {
    queueActive.current = true;
    refreshIndex.current = 0;
    setIsRefreshing(true);
    scheduleNext();
  }, [scheduleNext]);

  const triggerQueue = useCallback(
    (reason: string) => {
      const hasDirty = peekDirty();
      if (!hasDirty && reason !== 'event') {
        if (queueActive.current) {
          refreshIndex.current = 0;
          scheduleNext();
        }
        return;
      }
      if (queueActive.current) {
        refreshIndex.current = 0;
        scheduleNext();
      } else {
        startQueue();
      }
    },
    [peekDirty, scheduleNext, startQueue]
  );

  useEffect(() => () => clearTimer(), [clearTimer]);

  return {
    isRefreshing,
    triggerQueue,
    stopQueue
  };
}
