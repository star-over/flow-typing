import { describe, expect, it, vi } from 'vitest';
import { createActor, createMachine } from 'xstate';

import type { TypingStream } from '@/interfaces/types';
import { sym } from '@/fixtures/stream';
import { makeCompletionSink, provideSession, trainingSnapshotOf } from '@/fixtures/machines';
import {
  REFILL_THRESHOLD_SYMBOLS,
  SESSION_DURATION_SECONDS,
  TICK_INTERVAL_MS,
} from '@/lib/session-config';

const SESSION_WINDOW_MS = SESSION_DURATION_SECONDS * 1000;

const TWO: TypingStream = [sym('a', 'KeyA'), sym('b', 'KeyB')];

// Болванка-родитель: `SessionInput.parentActor` обязателен по типам, поэтому
// каждому INPUT нужен реальный ActorRef. Тестам, которым неважно SESSION.COMPLETE,
// хватает пустой машины (событие просто игнорируется).
const noopParent = createActor(createMachine({ id: 'noopParent' })).start();
const INPUT = { symbolLayoutId: 'qwerty' as const, cpm: 200, parentActor: noopParent };

// Часы стоят до первого нажатия: после loading сессия ждёт в active.armed.
const ARMED = { active: 'armed' } as const;
// Активная печать живёт в active.timing.running (тикер и сегмент таймера — на
// родителе timing, чтобы пережить bounce running↔refilling).
const RUNNING = { active: { timing: 'running' } } as const;

describe('sessionMachine', () => {
  it('после loading ждёт в active.armed (часы стоят), первое нажатие → timing.running', async () => {
    const actor = createActor(provideSession({ fetchSequence: [TWO] }), { input: INPUT });
    actor.start();
    await vi.waitFor(() => {
      expect(actor.getSnapshot().matches(ARMED)).toBe(true);
    });
    expect(trainingSnapshotOf(actor)!.context.stream.map((s) => s.targetSymbol)).toEqual(['a', 'b']);
    // Часы ещё не пошли → дисплей держит полное окно.
    expect(actor.getSnapshot().context.displayElapsedMs).toBe(0);

    actor.send({ type: 'KEY_PRESS', keys: ['KeyA'] });
    // Часы пошли — вышли из armed в timing (running/refilling зависит от длины очереди).
    expect(actor.getSnapshot().matches({ active: 'timing' })).toBe(true);
  });

  it('накапливает completed[] из TYPING.ADVANCED по мере печати', async () => {
    const actor = createActor(provideSession({ fetchSequence: [TWO] }), { input: INPUT });
    actor.start();
    await vi.waitFor(() => expect(actor.getSnapshot().matches(ARMED)).toBe(true));

    actor.send({ type: 'KEY_PRESS', keys: ['KeyA'] });
    await vi.waitFor(() =>
      expect(actor.getSnapshot().context.completed.map((s) => s.targetSymbol)).toEqual(['a'])
    );
  });

  it('пауза в timing замораживает И таймер, И печать', async () => {
    const actor = createActor(provideSession({ fetchSequence: [TWO] }), { input: INPUT });
    actor.start();
    await vi.waitFor(() => expect(actor.getSnapshot().matches(ARMED)).toBe(true));

    actor.send({ type: 'KEY_PRESS', keys: ['KeyA'] }); // первое нажатие → timing.running, часы пошли
    await vi.waitFor(() => expect(actor.getSnapshot().context.completed).toHaveLength(1));

    actor.send({ type: 'PAUSE_TIMER' });
    expect(actor.getSnapshot().matches({ active: 'paused' })).toBe(true);
    const frozen = actor.getSnapshot().context.elapsedMs;

    actor.send({ type: 'KEY_PRESS', keys: ['KeyB'] }); // во время паузы — игнор
    await Promise.resolve();
    expect(actor.getSnapshot().context.completed).toHaveLength(1); // печать заморожена

    actor.send({ type: 'RESUME_TIMER' });
    expect(actor.getSnapshot().matches(RUNNING)).toBe(true);
    expect(actor.getSnapshot().context.elapsedMs).toBe(frozen); // таймер заморожен
  });

  it('пауза ДО первого нажатия (armedPaused): часы стоят, ввод игнорируется', async () => {
    const actor = createActor(provideSession({ fetchSequence: [TWO] }), { input: INPUT });
    actor.start();
    await vi.waitFor(() => expect(actor.getSnapshot().matches(ARMED)).toBe(true));

    actor.send({ type: 'PAUSE_TIMER' });
    expect(actor.getSnapshot().matches({ active: 'armedPaused' })).toBe(true);

    actor.send({ type: 'KEY_PRESS', keys: ['KeyA'] }); // на паузе до старта — игнор, таймер не стартует
    await Promise.resolve();
    const snap = actor.getSnapshot();
    expect(snap.matches({ active: 'armedPaused' })).toBe(true);
    expect(snap.context.completed).toHaveLength(0);
    expect(snap.context.displayElapsedMs).toBe(0);
    expect(trainingSnapshotOf(actor)!.context.currentIndex).toBe(0);
  });

  it('истечение таймера → СРАЗУ done + SESSION.COMPLETE; ввод после истечения не добирается', async () => {
    const onRecord = vi.fn();
    // Сток-родитель: ловит SESSION.COMPLETE. Без него sendComplete уходит в self
    // (XState-запасной вариант при отсутствии parentActor) и «родителю» НЕ проверяется.
    const sink = makeCompletionSink();
    // Поток длиннее порога refill — одно нажатие не дёргает дозагрузку, чекпоинт
    // ровно один (финальный), сценарий «истёк → стоп» чистый.
    const LONG: TypingStream = Array.from({ length: REFILL_THRESHOLD_SYMBOLS + 5 }, () => sym('a', 'KeyA'));
    const actor = createActor(
      provideSession({ fetchSequence: [LONG], onCheckpoint: onRecord }),
      { input: { ...INPUT, parentActor: sink } },
    );
    actor.start();
    await vi.waitFor(() => expect(actor.getSnapshot().matches(ARMED)).toBe(true));

    actor.send({ type: 'KEY_PRESS', keys: ['KeyA'] }); // набрали 'a' → timing.running
    await vi.waitFor(() => expect(actor.getSnapshot().context.completed).toHaveLength(1));

    actor.send({ type: 'TIMER_EXPIRED' }); // истёк → сразу done (без draining/добора)
    await vi.waitFor(() => expect(actor.getSnapshot().matches('done')).toBe(true));

    // Очередь НЕ добирается: completed застыл на наборе до истечения, родителю ушёл он же.
    expect(actor.getSnapshot().context.completed).toHaveLength(1);
    expect(onRecord).toHaveBeenCalledTimes(1); // единственный (финальный) чекпоинт
    expect(sink.getSnapshot().context.completions).toHaveLength(1); // родитель получил SESSION.COMPLETE
    expect(sink.getSnapshot().context.completions[0]!.stream).toHaveLength(1); // только набранное до истечения ['a']
  });

  it('истёкший таймер при уже допечатанном потоке → сразу done', async () => {
    // Однобуквенный поток: печать 'a' запускает refill (порог 40 ≫ 1). Чтобы
    // refill был безвреден (не раздул totalAppended), добор возвращает [].
    const actor = createActor(
      provideSession({ fetchSequence: [[sym('a', 'KeyA')]] }),
      { input: INPUT },
    );
    actor.start();
    await vi.waitFor(() => expect(actor.getSnapshot().matches(ARMED)).toBe(true));

    actor.send({ type: 'KEY_PRESS', keys: ['KeyA'] }); // всё набрано (refill вернёт [], totalAppended=1)
    await vi.waitFor(() => expect(actor.getSnapshot().context.completed).toHaveLength(1));
    actor.send({ type: 'TIMER_EXPIRED' });
    await vi.waitFor(() => expect(actor.getSnapshot().matches('done')).toBe(true));
  });

  it('низкая вода очереди → чекпоинт + APPEND дозагруженного хвоста', async () => {
    const onRecord = vi.fn();
    // fetch отдаёт по 1 символу за раз — порог refill заведомо пробивается.
    const actor = createActor(
      provideSession({
        fetchSequence: [[sym('a', 'KeyA')], [sym('b', 'KeyB')]],
        onCheckpoint: onRecord,
      }),
      { input: INPUT },
    );
    actor.start();
    await vi.waitFor(() => expect(actor.getSnapshot().matches(ARMED)).toBe(true));

    actor.send({ type: 'KEY_PRESS', keys: ['KeyA'] }); // допечатали хвост → refill
    await vi.waitFor(() => {
      expect(trainingSnapshotOf(actor)!.context.stream.length).toBeGreaterThan(1); // дописан 'b'
    });
    expect(onRecord).toHaveBeenCalled(); // чекпоинт перед добором
  });

  it('refill срабатывает ровно на пороге (+1-поправка), не раньше', async () => {
    const onRecord = vi.fn();
    // Поток длиной ровно порог+2: needsRefill ложен на 1-м продвижении (остаётся
    // 41 > 40) и истинен на 2-м (остаток упал бы до 40). Добор возвращает [].
    const big: TypingStream = Array.from({ length: REFILL_THRESHOLD_SYMBOLS + 2 }, () => sym('a', 'KeyA'));
    const actor = createActor(
      provideSession({ fetchSequence: [big], onCheckpoint: onRecord }),
      { input: INPUT },
    );
    actor.start();
    await vi.waitFor(() => expect(actor.getSnapshot().matches(ARMED)).toBe(true));

    actor.send({ type: 'KEY_PRESS', keys: ['KeyA'] }); // 1-й символ: остаётся 41 > 40 → НЕ refill
    await Promise.resolve();
    expect(onRecord).not.toHaveBeenCalled();

    actor.send({ type: 'KEY_PRESS', keys: ['KeyA'] }); // 2-й: остаток упал бы до 40 → refill (чекпоинт)
    await vi.waitFor(() => expect(onRecord).toHaveBeenCalled());
  });

  it('стык порций при refill разделяется пробелом (нет склейки слов)', async () => {
    // Порция 1 = "a", порция 2 = "b". Без разделителя поток склеится в "ab"
    // (слова слипаются на стыке порций); на границе должен быть пробел → "a b".
    const actor = createActor(
      provideSession({ fetchSequence: [[sym('a', 'KeyA')], [sym('b', 'KeyB')]] }),
      { input: INPUT },
    );
    actor.start();
    await vi.waitFor(() => expect(actor.getSnapshot().matches(ARMED)).toBe(true));

    actor.send({ type: 'KEY_PRESS', keys: ['KeyA'] }); // допечатали "a" → refill дописывает порцию 2
    await vi.waitFor(() => {
      const training = trainingSnapshotOf(actor)!;
      expect(training.context.stream.map((s) => s.targetSymbol).join('')).toBe('a b');
    });
  });

  it('на завершении сессии (done) шлёт recordSessionSummary с payload по всему потоку', async () => {
    const onSession = vi.fn();
    // Восемь символов: с запасом проходим guard MIN_JOURNAL_EXPOSURES (5).
    const EIGHT: TypingStream = Array.from({ length: 8 }, () => sym('a', 'KeyA'));
    const actor = createActor(
      provideSession({ fetchSequence: [EIGHT], onSession }),
      { input: INPUT },
    );
    actor.start();
    await vi.waitFor(() => expect(actor.getSnapshot().matches(ARMED)).toBe(true));

    for (let i = 0; i < 8; i += 1) actor.send({ type: 'KEY_PRESS', keys: ['KeyA'] });
    await vi.waitFor(() => expect(actor.getSnapshot().context.completed).toHaveLength(8));
    actor.send({ type: 'TIMER_EXPIRED' });
    await vi.waitFor(() => expect(actor.getSnapshot().matches('done')).toBe(true));

    expect(onSession).toHaveBeenCalledTimes(1); // ровно один раз — в done, не на дозагрузках
    const payload = onSession.mock.calls[0]![0] as { exposures: number; confusions: unknown[]; durationMs: number };
    expect(payload.exposures).toBe(8);
    expect(payload.confusions).toEqual([]);
    expect(typeof payload.durationMs).toBe('number');
  });

  // Порядок завершения теперь выражен структурой finalizeAndNotify, а не массивом
  // entry; эти два теста замыкают его load-bearing инварианты прямо на поведении.

  // Поток заметно длиннее порога → за 6 продвижений refill не срабатывает (хвост
  // выше порога), значит чекпоинт ровно один — финальный, в done. Запись профиля и
  // запись журнала помечают порядок диспетчеризации в общий массив.
  function longStreamSession({
    onCheckpoint = () => {},
    onSession = () => {},
  }: {
    onCheckpoint?: () => void;
    onSession?: (payload: { exposures: number }) => void;
  } = {}) {
    const LONG: TypingStream = Array.from({ length: REFILL_THRESHOLD_SYMBOLS + 20 }, () => sym('a', 'KeyA'));
    return provideSession({
      fetchSequence: [LONG],
      onCheckpoint: () => onCheckpoint(),
      onSession: (payload) => onSession(payload),
    });
  }

  // Лок «6 нажатий < порог refill»: если REFILL_THRESHOLD_SYMBOLS упадёт до ≤6,
  // longStreamSession начнёт молча дозагружать на 6 нажатиях и оба done-теста
  // потеряют инвариант «чекпоинт ровно один». Явный страж — падает громко.
  it('инвариант longStreamSession: 6 нажатий заведомо ниже порога refill', () => {
    expect(6).toBeLessThan(REFILL_THRESHOLD_SYMBOLS);
  });

  it('done (b): чекпоинт (drillRecord) диспетчеризуется ДО журнала сессии — CQRS write-before-read', async () => {
    const order: string[] = [];
    const actor = createActor(
      longStreamSession({ onCheckpoint: () => order.push('checkpoint'), onSession: () => order.push('session') }),
      { input: INPUT },
    );
    actor.start();
    await vi.waitFor(() => expect(actor.getSnapshot().matches(ARMED)).toBe(true));

    for (let i = 0; i < 6; i += 1) actor.send({ type: 'KEY_PRESS', keys: ['KeyA'] });
    await vi.waitFor(() => expect(actor.getSnapshot().context.completed).toHaveLength(6));
    actor.send({ type: 'TIMER_EXPIRED' });
    await vi.waitFor(() => expect(actor.getSnapshot().matches('done')).toBe(true));

    // Ровно один (финальный) чекпоинт и один журнал; чекпоинт — строго раньше.
    expect(order).toEqual(['checkpoint', 'session']);
  });

  it('done (a): SESSION.COMPLETE несёт уже посчитанную summary — те же числа, что в журнале', async () => {
    let journalPayload: { exposures: number } | undefined;
    const sink = makeCompletionSink();
    const actor = createActor(
      longStreamSession({ onSession: (payload) => (journalPayload = payload) }),
      { input: { ...INPUT, parentActor: sink } },
    );
    actor.start();
    await vi.waitFor(() => expect(actor.getSnapshot().matches(ARMED)).toBe(true));

    for (let i = 0; i < 6; i += 1) actor.send({ type: 'KEY_PRESS', keys: ['KeyA'] });
    await vi.waitFor(() => expect(actor.getSnapshot().context.completed).toHaveLength(6));
    actor.send({ type: 'TIMER_EXPIRED' });
    await vi.waitFor(() => expect(actor.getSnapshot().matches('done')).toBe(true));

    // summary посчитан ДО отправки (иначе родитель получил бы null) и совпадает с журналом.
    const received = sink.getSnapshot().context.completions[0]?.summary as { exposures: number } | null;
    expect(received).not.toBeNull();
    expect(received!.exposures).toBe(6);
    expect(journalPayload?.exposures).toBe(6);
  });

  // Реальный time-driven путь истечения: тикер (setInterval) → TICK → guard
  // isExpired → done. Прежде истечение подделывалось ручным TIMER_EXPIRED, и ни
  // тикер, ни обе ветки TICK (истечение / refreshDisplay) не гонялись. Фейковые
  // таймеры двигают И setInterval, И Date.now() (guard читает живое время).
  describe('реальный путь истечения (fake timers)', () => {
    const LONG: TypingStream = Array.from({ length: REFILL_THRESHOLD_SYMBOLS + 5 }, () => sym('a', 'KeyA'));

    it('тикер → TICK → isExpired → done, без ручного TIMER_EXPIRED', async () => {
      vi.useFakeTimers();
      try {
        const actor = createActor(provideSession({ fetchSequence: [LONG] }), { input: INPUT });
        actor.start();
        // fetchDrills — fromPromise: разрешается микрозадачей; advanceTimersByTimeAsync
        // сплющивает очередь микрозадач → loading → active.armed.
        await vi.advanceTimersByTimeAsync(0);
        expect(actor.getSnapshot().matches(ARMED)).toBe(true);

        actor.send({ type: 'KEY_PRESS', keys: ['KeyA'] }); // старт сегмента + setInterval-тикер
        expect(actor.getSnapshot().matches({ active: 'timing' })).toBe(true);

        // Прокрутить окно: на первом тике за окном isExpired истинен → #session.done.
        await vi.advanceTimersByTimeAsync(SESSION_WINDOW_MS + TICK_INTERVAL_MS);
        expect(actor.getSnapshot().matches('done')).toBe(true);
        expect(actor.getSnapshot().context.completed).toHaveLength(1); // набранное до истечения
      } finally {
        vi.useRealTimers();
      }
    });

    it('TICK до истечения обновляет displayElapsedMs, не завершая сессию', async () => {
      vi.useFakeTimers();
      try {
        const actor = createActor(provideSession({ fetchSequence: [LONG] }), { input: INPUT });
        actor.start();
        await vi.advanceTimersByTimeAsync(0);
        actor.send({ type: 'KEY_PRESS', keys: ['KeyA'] });

        await vi.advanceTimersByTimeAsync(3 * TICK_INTERVAL_MS); // 3 тика, окно ещё далеко
        const snap = actor.getSnapshot();
        expect(snap.matches({ active: 'timing' })).toBe(true); // ветка refreshDisplay, не истечение
        expect(snap.context.displayElapsedMs).toBeGreaterThanOrEqual(3 * TICK_INTERVAL_MS);
        expect(snap.context.displayElapsedMs).toBeLessThan(SESSION_WINDOW_MS);
      } finally {
        vi.useRealTimers();
      }
    });
  });
});
