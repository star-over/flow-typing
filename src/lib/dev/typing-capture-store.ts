/**
 * @file Dev-only: локальное хранилище набора данных печати (IndexedDB) +
 * выгрузка в JSONL. Зависимостей нет — тонкая обёртка над raw IndexedDB.
 * Все функции вызываются только в браузере (из перехватчика или консоли).
 */
import type { TypingRunRecord } from './typing-run';

const DB_NAME = 'flow-typing-dev';
const STORE = 'typing-runs';
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function tx<T>({
  mode,
  run,
}: {
  mode: IDBTransactionMode;
  run: (store: IDBObjectStore) => IDBRequest<T>;
}): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE, mode);
        const request = run(transaction.objectStore(STORE));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        transaction.oncomplete = () => db.close();
      }),
  );
}

export function append(record: TypingRunRecord): Promise<IDBValidKey> {
  return tx({ mode: 'readwrite', run: (store) => store.add(record) });
}

export function getAll(): Promise<TypingRunRecord[]> {
  return tx({ mode: 'readonly', run: (store) => store.getAll() as IDBRequest<TypingRunRecord[]> });
}

export function count(): Promise<number> {
  return tx({ mode: 'readonly', run: (store) => store.count() });
}

export function clear(): Promise<undefined> {
  return tx({ mode: 'readwrite', run: (store) => store.clear() });
}

/** Скачивает накопленный набор данных как JSONL (одна запись на строку). */
export async function exportJsonl(): Promise<number> {
  const records = await getAll();
  const jsonl = records.map((record) => JSON.stringify(record)).join('\n');
  const blob = new Blob([jsonl], { type: 'application/x-ndjson' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `typing-data-${records.length}.jsonl`;
  anchor.click();
  URL.revokeObjectURL(url);
  return records.length;
}
