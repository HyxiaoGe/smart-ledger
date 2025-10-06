// IndexedDB 简易封装（仅在浏览器端使用；中文注释）
// 提供 get/set/remove，使用单一数据库 smart-ledger，表 ai_summaries，主键 key

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      return reject(new Error('IndexedDB 不可用'));
    }
    const req = indexedDB.open('smart-ledger', 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('ai_summaries')) {
        db.createObjectStore('ai_summaries', { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('IndexedDB 打开失败'));
  });
  return dbPromise;
}

export async function idbGet<T = any>(key: string): Promise<T | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('ai_summaries', 'readonly');
    const store = tx.objectStore('ai_summaries');
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result?.value as T | undefined);
    req.onerror = () => reject(req.error || new Error('IndexedDB 读取失败'));
  });
}

export async function idbSet<T = any>(key: string, value: T): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('ai_summaries', 'readwrite');
    const store = tx.objectStore('ai_summaries');
    const req = store.put({ key, value, updatedAt: Date.now() });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error || new Error('IndexedDB 写入失败'));
  });
}

export async function idbRemove(key: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('ai_summaries', 'readwrite');
    const store = tx.objectStore('ai_summaries');
    const req = store.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error || new Error('IndexedDB 删除失败'));
  });
}
