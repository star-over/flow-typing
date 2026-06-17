/**
 * @file Dev-only: перехват завершённых сессий в локальный набор данных.
 *
 * Подписывается на appActor и на входе в `sessionComplete` пишет
 * `context.lastTrainingStream` в IndexedDB. Выставляет `window.__typingData`
 * для выгрузки из консоли. В прод-сборку не входит — вызывается только под
 * `import.meta.env.DEV`.
 *
 * Машину состояний не трогает: читает уже сохранённый поток из контекста.
 */
import type { Actor } from 'xstate';
import type { appMachine } from '@/machines/app.machine';
import { streamToRunRecord } from './typing-run';
import * as store from './typing-capture-store';

type AppActor = Actor<typeof appMachine>;

interface TypingDataConsoleApi {
  count: () => Promise<number>;
  export: () => Promise<number>;
  clear: () => Promise<void>;
}

let attached = false;

/** Привязывает перехват к singleton appActor. Идемпотентно. */
export function attachTypingCapture(appActor: AppActor): void {
  if (attached) return;
  attached = true;

  // Все методы async (IndexedDB). Дополнительно печатают результат в консоль по
  // завершении — чтобы голый вызов (без await) всё равно показал число;
  // Promise при этом возвращается, так что `await __typingData.count()` тоже работает.
  const log = (message: string): void => console.info(`[typing-capture] ${message}`);
  (window as unknown as { __typingData: TypingDataConsoleApi }).__typingData = {
    count: () =>
      store.count().then((value) => {
        log(`записей: ${value}`);
        return value;
      }),
    export: () =>
      store.exportJsonl().then((value) => {
        log(`выгружено записей: ${value}`);
        return value;
      }),
    clear: () =>
      store.clear().then(() => {
        log('очищено');
      }),
  };

  let capturedThisSession = false;
  appActor.subscribe((state) => {
    if (state.value !== 'sessionComplete') {
      capturedThisSession = false; // покинули экран — готовы к следующей сессии
      return;
    }
    if (capturedThisSession) return;
    capturedThisSession = true;

    const stream = state.context.lastTrainingStream;
    if (!stream || stream.length === 0) return;

    const record = streamToRunRecord({
      stream,
      symbolLayoutId: state.context.currentSymbolLayoutId,
      capturedAt: Date.now(),
    });
    void store.append(record);
    console.info(
      `[typing-capture] сессия захвачена (${record.symbols.length} символов). ` +
        `window.__typingData.export() — выгрузить JSONL.`,
    );
  });

  console.info('[typing-capture] активен. window.__typingData = { count, export, clear }');
}
