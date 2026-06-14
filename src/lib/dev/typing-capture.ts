/**
 * @file Dev-only: перехват завершённых drill'ов в локальный набор данных.
 *
 * Подписывается на дочерний training-актор и в момент `lessonComplete` пишет
 * сырой поток в IndexedDB. Выставляет `window.__typingData` для выгрузки из
 * консоли. В прод-сборку не входит — вызывается только под `import.meta.env.DEV`.
 *
 * Машину состояний не трогает: использует тот же `state.children.trainingService`,
 * что и UI, и читает `context.stream` на завершении.
 */
import type { Actor, SnapshotFrom } from 'xstate';
import type { appMachine } from '@/machines/app.machine';
import type { trainingMachine } from '@/machines/training.machine';
import { streamToRunRecord } from './typing-run';
import * as store from './typing-capture-store';

type AppActor = Actor<typeof appMachine>;
type TrainingActor = Actor<typeof trainingMachine>;

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

  const capturedChildren = new WeakSet<TrainingActor>();
  let lastChild: TrainingActor | undefined;

  appActor.subscribe((state) => {
    const child = state.children.trainingService as TrainingActor | undefined;
    if (!child || child === lastChild) return;
    lastChild = child;

    const childSub = child.subscribe((snapshot: SnapshotFrom<typeof trainingMachine>) => {
      if (snapshot.value !== 'lessonComplete' || capturedChildren.has(child)) return;
      capturedChildren.add(child);
      childSub.unsubscribe();

      const record = streamToRunRecord({
        stream: snapshot.context.stream,
        symbolLayoutId: snapshot.context.currentSymbolLayoutId,
        capturedAt: Date.now(),
      });
      void store.append(record);
      console.info(
        `[typing-capture] drill захвачен (${record.symbols.length} символов). ` +
          `window.__typingData.export() — выгрузить JSONL.`,
      );
    });
  });

  console.info('[typing-capture] активен. window.__typingData = { count, export, clear }');
}
