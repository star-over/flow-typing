import { describe, expect, it } from 'vitest';
import type { TypingStream } from '@/interfaces/types';
import { streamToRunRecord } from './typing-run';

describe('streamToRunRecord', () => {
  const stream: TypingStream = [
    {
      targetSymbol: 'ф',
      targetKeyCaps: ['KeyA'],
      attempts: [{ pressedKeyCaps: ['KeyA'], startAt: 100, endAt: 220 }],
    },
    {
      targetSymbol: 'ы',
      targetKeyCaps: ['KeyS'],
      attempts: [
        { pressedKeyCaps: ['KeyD'], startAt: 220, endAt: 400 }, // ошибка
        { pressedKeyCaps: ['KeyS'], startAt: 400, endAt: 480 }, // исправление
      ],
    },
  ];

  it('восстанавливает текст из целевых символов потока', () => {
    const record = streamToRunRecord({
      stream,
      symbolLayoutId: 'йцукен',
      capturedAt: 1_700_000_000_000,
    });
    expect(record.text).toBe('фы');
  });

  it('проставляет контекст и сохраняет сырой поток без потерь', () => {
    const record = streamToRunRecord({
      stream,
      symbolLayoutId: 'йцукен',
      capturedAt: 1_700_000_000_000,
    });
    expect(record.symbolLayoutId).toBe('йцукен');
    expect(record.capturedAt).toBe(1_700_000_000_000);
    // тот же объект потока — ничего не агрегируем и не копируем
    expect(record.symbols).toBe(stream);
    // путаница сохранена: на 'ы' первая (ошибочная) попытка — 'KeyD'
    expect(record.symbols[1]?.attempts[0]?.pressedKeyCaps).toEqual(['KeyD']);
    // временные метки на месте для расчёта латентности
    expect(record.symbols[0]?.attempts[0]?.endAt).toBe(220);
  });
});
