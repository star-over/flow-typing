import { describe, expect, it, vi } from 'vitest';
import { createActor, createMachine } from 'xstate';

import type { TypingStream } from '@/interfaces/types';
import { sym } from '@/fixtures/stream';
import { provideSession } from '@/fixtures/machines';
import { selectSessionTimer } from '@/machines/selectors';
import { TICK_INTERVAL_MS } from '@/lib/session-config';

// Болванка-родитель: `SessionInput.parentActor` обязателен по типам. Тестам
// селектора неважно SESSION.COMPLETE — пустая машина событие игнорирует.
const noopParent = createActor(createMachine({ id: 'noopParent' })).start();
const DURATION_SECONDS = 60;
const INPUT = {
  symbolLayoutId: 'qwerty' as const,
  cpm: 200,
  durationSeconds: DURATION_SECONDS,
  parentActor: noopParent,
};

// Достаточно длинная порция, чтобы после первого нажатия сессия жила в timing
// и часы тикали, не завершившись досрочно.
const LONG: TypingStream = Array.from({ length: 12 }, () => sym('a', 'KeyA'));

describe('selectSessionTimer', () => {
  it('отдаёт ровно два поля таймера из контекста session-снимка', async () => {
    vi.useFakeTimers();
    try {
      const actor = createActor(provideSession({ fetchSequence: [LONG] }), { input: INPUT });
      actor.start();
      await vi.advanceTimersByTimeAsync(0); // разрешить fetchDrills → armed

      // До первого нажатия часы стоят: displayElapsedMs = 0, durationSeconds — из INPUT.
      expect(selectSessionTimer(actor.getSnapshot())).toEqual({
        displayElapsedMs: 0,
        durationSeconds: DURATION_SECONDS,
      });

      // После нажатия часы идут — displayElapsedMs становится ненулевым; селектор
      // отражает живое значение контекста, а не дефолт.
      actor.send({ type: 'KEY_PRESS', keys: ['KeyA'] });
      await vi.advanceTimersByTimeAsync(3 * TICK_INTERVAL_MS);

      const snapshot = actor.getSnapshot();
      expect(selectSessionTimer(snapshot)).toEqual({
        displayElapsedMs: snapshot.context.displayElapsedMs,
        durationSeconds: snapshot.context.durationSeconds,
      });
      expect(selectSessionTimer(snapshot).displayElapsedMs).toBeGreaterThan(0);
    } finally {
      vi.useRealTimers();
    }
  });
});
