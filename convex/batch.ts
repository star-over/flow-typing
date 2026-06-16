/**
 * @file Выдача порции упражнений — `getNextBatch`. Этап 1 «Рабочая петля»:
 * минимум без ума — жёсткий фильтр по набору введённых букв (Repertoire) +
 * случайный выбор + добор под бюджет. Ранжирование, фокус на слабых местах и
 * подстройка трудности — последующие этапы (ADR 0003/0004, план Auto-Flow).
 *
 * Это **mutation**, а не query: query в Convex кэшируется и реактивна — повторный
 * вызов с теми же аргументами вернул бы ту же порцию; нам нужна свежая случайная
 * выборка на каждый поход за порцией. Сюда же позже ляжет ленивое создание
 * анонимного профиля (ADR 0005).
 *
 * Контракт говорит в **символах и записях**, не в cpm (ADR 0006): cpm и таймер —
 * клиентские бизнес-сущности, клиент сам считает `budgetChars` из своей скорости
 * и остатка таймера и просит «добери порцию на ~budgetChars». Сайзинг и финальная
 * фильтрация — в одном слое (здесь), иначе промах по количеству.
 *
 * Жёсткое требование одно: drill доступен ⟺ его `stepLevel` в таблице отбора
 * `< openedSteps` (ADR 0001) — индексируемое сравнение через `by_layout_and_step`.
 * `openedSteps` пока приходит параметром (на этапе 1 набор букв фиксирован,
 * профиль ещё ничего не выбирает); позже его будет давать Skill Profile.
 */
import { mutation } from './_generated/server';
import { v } from 'convex/values';
import type { Id } from './_generated/dataModel';

export const getNextBatch = mutation({
  args: {
    symbolLayoutId: v.string(),
    openedSteps: v.number(),
    budgetChars: v.number(),
  },
  returns: v.object({
    contentGap: v.boolean(),
    drills: v.array(v.object({ id: v.id('drills'), text: v.string(), length: v.number() })),
  }),
  handler: async (ctx, args) => {
    // Жёсткий фильтр: все доступные drill'ы раскладки (stepLevel < openedSteps).
    const eligible = await ctx.db
      .query('drillSelectionIndex')
      .withIndex('by_layout_and_step', (q) =>
        q.eq('symbolLayoutId', args.symbolLayoutId).lt('stepLevel', args.openedSteps)
      )
      .collect();

    // Ноль кандидатов — не деградация, а контентный сбой (дыра в корпусе либо
    // нет таблицы отбора для раскладки). Сессию не блокируем: сигналим в лог,
    // дефолтный drill домашнего ряда — задача клиента/следующего шага.
    if (eligible.length === 0) {
      console.warn(
        `getNextBatch: пустой пул (раскладка ${args.symbolLayoutId}, openedSteps ${args.openedSteps}) — контентный сбой`
      );
      return { contentGap: true, drills: [] };
    }

    // Случайный порядок: сортировка по случайному ключу. Math.random в Convex —
    // детерминированный seed на вызов (выборка случайна, воспроизводима на реплее).
    // Перф-заметка: собираем весь пул индекса (строки крошечные) ради честной
    // случайности; при росте корпуса заменимо индексом со случайным ключом.
    const shuffledIds: Id<'drills'>[] = eligible
      .map((row) => ({ id: row.drillId, key: Math.random() }))
      .sort((a, b) => a.key - b.key)
      .map((entry) => entry.id);

    // Добор по бюджету: берём drill'ы в случайном порядке, пока не наберём
    // budgetChars. Недобор допустим (ранний поход за следующей порцией); перебор —
    // максимум на один последний drill. Тексты тянем только у выбранных (~десяток),
    // не у всего пула.
    const drills: { id: Id<'drills'>; text: string; length: number }[] = [];
    let total = 0;
    for (const id of shuffledIds) {
      if (drills.length > 0 && total >= args.budgetChars) break;
      const drill = await ctx.db.get(id);
      if (drill === null) continue;
      drills.push({ id: drill._id, text: drill.text, length: drill.length });
      total += drill.length;
    }

    return { contentGap: false, drills };
  },
});
