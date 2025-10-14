"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { DEFAULT_CURRENCY } from '@/lib/config';
import { MarkdownView } from '@/components/MarkdownView';
import { idbGet, idbSet, idbRemove, idbClearAll } from '@/lib/idb';
import { formatMonth } from '@/lib/date';

export function AiAnalyzeButton({ currency = 'CNY', month }: { currency?: string; month?: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [summary, setSummary] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const esRef = useRef<EventSource | null>(null);
  const cacheRef = useRef<Map<string, string>>(new Map());

  const monthStr = useMemo(() => month || formatMonth(new Date()), [month]);

  // 轻量规范化：为常见 Markdown 记号补齐换行，增强层次感，仅影响显示，不影响复制
  function normalizeMd(src: string): string {
    if (!src) return '';
    let t = src;
    // 在 '---' 前后补空行
    t = t.replace(/\s*---\s*/g, '\n\n---\n\n');
    // 标题与内容之间强制换行：## 标题- 列表 → 换成 \n- 列表
    t = t.replace(/(#{1,6}\s[^\n]+)-\s/g, '$1\n- ');
    t = t.replace(/(#{1,6}\s[^\n]+)(\d+)\.\s/g, '$1\n$2. ');
    // 标题前若无换行，补一个
    t = t.replace(/([^\n])\s*(#{1,6}\s)/g, '$1\n$2');
    // 列表项之间确保换行（将双空格连写的列表压平为独立行）
    t = t.replace(/\s{2,}-\s/g, '\n- ');
    t = t.replace(/\s{2,}(\d+)\.\s/g, '\n$1. ');
    return t;
  }
  const normalized = useMemo(() => normalizeMd(summary), [summary]);

  function onClose() {
    if (esRef.current) {
      try { esRef.current.close(); } catch {}
      esRef.current = null;
    }
    setLoading(false);
    setOpen(false);
  }

  const run = useCallback(async () => {
    setOpen(true);
    setLoading(true);
    setError('');
    setSummary('');
    try {
      // 优先使用 GET + SSE 的 EventSource，前端可见真流式
      await new Promise<void>((resolve, reject) => {
        const url = `/api/analyze/stream?month=${encodeURIComponent(monthStr)}&currency=${encodeURIComponent(currency)}`;
        const es = new EventSource(url);
        esRef.current = es;
        const cacheKey = `${currency}|${monthStr}`;
        let lastWrite = 0;
        es.onmessage = (ev) => {
          if (ev.data === '[END]') {
            es.close();
            esRef.current = null;
            resolve();
            return;
          }
          setSummary((prev) => {
            const next = (prev || '') + ev.data;
            cacheRef.current.set(cacheKey, next);
            const now = Date.now();
            if (now - lastWrite > 200) {
              lastWrite = now;
              idbSet(cacheKey, next).catch(() => {});
            }
            return next;
          });
        };
        es.onerror = () => {
          es.close();
          esRef.current = null;
          reject(new Error('SSE 连接失败'));
        };
      });
    } catch (e: any) {
      setError(e?.message || '分析失败');
    } finally {
      setLoading(false);
    }
  }, [monthStr, currency]);

  // 主按钮：若已有缓存，则直接展示缓存；否则触发生成
  const onOpen = async () => {
    const key = `${currency}|${monthStr}`;
    // 先查内存，再查 IndexedDB
    const mem = cacheRef.current.get(key);
    const disk = mem && mem.trim() ? mem : await idbGet<string>(key);
    if (disk && disk.trim()) {
      setSummary(disk);
      setError('');
      setOpen(true);
      setLoading(false);
      return;
    }
    await run();
  };

  // 打开弹窗时禁止页面滚动，避免背后内容与弹窗视觉重叠滚动错乱
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  return (
    <>
      <button onClick={onOpen} className="inline-flex items-center h-9 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium">AI 分析</button>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm w-full max-w-2xl z-50" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold">AI 消费分析（{monthStr} / {currency}）</h3>
              <button className="inline-flex h-8 px-3 items-center rounded-md border text-sm" onClick={onClose}>关闭</button>
            </div>
            <div className="p-4 space-y-3">
              {loading && <p className="text-sm text-muted-foreground">分析中…</p>}
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <div className="min-h-[80px] max-h-[60vh] overflow-auto pr-1">
                <MarkdownView text={normalized} />
              </div>
              <div className="flex gap-2">
                <button
                  className="inline-flex h-8 px-3 items-center rounded-md border text-sm"
                  onClick={async () => {
                    const text = summary || '';
                    try {
                      await navigator.clipboard.writeText(text);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1500);
                    } catch {
                      // 回退：使用隐藏 textarea 复制
                      try {
                        const ta = document.createElement('textarea');
                        ta.value = text;
                        ta.style.position = 'fixed';
                        ta.style.opacity = '0';
                        document.body.appendChild(ta);
                        ta.focus();
                        ta.select();
                        document.execCommand('copy');
                        document.body.removeChild(ta);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1500);
                      } catch {}
                    }
                  }}
                >{copied ? '已复制' : '复制Markdown'}</button>
                <button
                  className="inline-flex h-8 px-3 items-center rounded-md border text-sm"
                  onClick={async () => {
                    const key = `${currency}|${monthStr}`;
                    try { await idbRemove(key); } catch {}
                    cacheRef.current.delete(key);
                    await run();
                  }}
                  disabled={loading}
                >重新分析</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
