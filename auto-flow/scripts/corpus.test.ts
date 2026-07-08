import { describe, it, expect } from 'vitest';
import { clean } from './clean';
import { segment } from './segment';
import { startsValid, withinLength, letterRatioOk, allSymbolsInLayout } from './filters';
import { computeMeta } from './meta';
import { computeCoverage } from './coverage';
import { buildDrills } from './pipeline';

// Набор символов раскладки йцукен (упрощённый, для тестов): буквы + пробел +
// базовая пунктуация + цифры. Латиницы намеренно нет — проверяем членство.
const RU_LOWER = 'абвгдеёжзийклмнопрстуфхцчшщъыьэюя';
const RU_SET = new Set([...(RU_LOWER + RU_LOWER.toUpperCase() + '0123456789 ".,!?-')]);

describe('clean', () => {
  it('раскодирует HTML-сущности', () => {
    expect(clean('Он сказал &quot;да&quot; и ушёл')).toBe('Он сказал "да" и ушёл');
  });
  it('нормализует ёлочки, схлопывает пробелы, убирает пробел перед пунктуацией', () => {
    expect(clean('«Школа  злословия»  учит , язык')).toBe('"Школа злословия" учит, язык');
  });
  it('приводит к NFC (составной символ → один кодпоинт)', () => {
    expect([...clean('é')].length).toBe(1);
  });
  it('убирает невидимые символы нулевой ширины', () => {
    expect(clean('сло​во')).toBe('слово');
  });
});

describe('segment', () => {
  it('одна непустая строка → одна единица', () => {
    expect(segment('Привет мир')).toEqual(['Привет мир']);
  });
  it('пустая строка → ничего', () => {
    expect(segment('   ')).toEqual([]);
  });
});

describe('startsValid', () => {
  it('буква — ок', () => expect(startsValid('Привет')).toBe(true));
  it('цифра — ок', () => expect(startsValid('1930 год')).toBe(true));
  it('кавычка перед буквой — ок', () => expect(startsValid('"Школа"')).toBe(true));
  it('тире-реплика — нет', () => expect(startsValid('— Привет')).toBe(false));
  it('двойной дефис — нет', () => expect(startsValid('-- что-то')).toBe(false));
  it('ведущее многоточие — нет', () => expect(startsValid('…и вот')).toBe(false));
});

describe('withinLength', () => {
  it('в границах', () => expect(withinLength({ text: 'абвг', min: 2, max: 10 })).toBe(true));
  it('короче минимума', () => expect(withinLength({ text: 'а', min: 2, max: 10 })).toBe(false));
  it('длиннее максимума', () =>
    expect(withinLength({ text: 'абвгдеёжзи', min: 2, max: 5 })).toBe(false));
});

describe('letterRatioOk', () => {
  it('текст из букв — проходит', () =>
    expect(letterRatioOk({ text: 'Привет', minRatio: 0.5 })).toBe(true));
  it('сплошные цифры — не проходит', () =>
    expect(letterRatioOk({ text: '12345', minRatio: 0.5 })).toBe(false));
});

describe('allSymbolsInLayout', () => {
  it('все символы в наборе', () =>
    expect(allSymbolsInLayout({ text: 'Привет, мир.', symbolSet: RU_SET })).toBe(true));
  it('латиница вне набора', () =>
    expect(allSymbolsInLayout({ text: 'Привет ICQ', symbolSet: RU_SET })).toBe(false));
});

describe('computeMeta', () => {
  it('считает мету одного слова', () => {
    const meta = computeMeta('дядя');
    expect(meta.length).toBe(4);
    expect(meta.uniqueSymbols).toEqual(['д', 'я']);
    expect(meta.wordCount).toBe(1);
    expect(meta.avgWordLength).toBe(4);
    expect(meta.maxWordLength).toBe(4);
    expect(meta.bigrams).toEqual(['дя', 'яд']);
    expect(meta.symbolFrequency).toEqual([
      { symbol: 'д', count: 2 },
      { symbol: 'я', count: 2 },
    ]);
  });
  it('пары букв не пересекают пробел; средняя длина округлена', () => {
    const meta = computeMeta('мама мыла');
    expect(meta.wordCount).toBe(2);
    expect(meta.avgWordLength).toBe(4);
    expect(meta.bigrams).not.toContain('а '); // пробел не входит в пары
    expect(meta.bigrams).not.toContain(' м');
  });
});

describe('computeCoverage', () => {
  it('делит набор раскладки на покрытые и пропущенные', () => {
    const drills = [{ text: 'аб', ...computeMeta('аб') }];
    const report = computeCoverage({ drills, symbolSet: new Set(['а', 'б', 'в']) });
    expect(report.covered).toEqual(['а', 'б']);
    expect(report.missing).toEqual(['в']);
  });
});

describe('buildDrills (интеграция)', () => {
  const texts = [
    '«Привет»  мир.', // чистится → '"Привет" мир.' — оставляем
    'Hello world', // латиница → членство отсекает
    '— Тире впереди', // реплика через тире → отсекает «начало»
    '«Привет»  мир.', // дубликат первого
    '12345', // нет букв → доля букв отсекает
  ];
  const result = buildDrills({ texts, symbolSet: RU_SET });

  it('оставляет только валидную уникальную единицу', () => {
    expect(result.drills.map((d) => d.text)).toEqual(['"Привет" мир.']);
  });
  it('считает статистику прогона', () => {
    expect(result.stats).toEqual({
      inputTexts: 5,
      units: 5,
      kept: 1,
      rejected: 3,
      duplicates: 1,
    });
  });
  it('отчёт покрытия отмечает встреченные и пропущенные символы', () => {
    expect(result.coverage.covered).toContain('р');
    expect(result.coverage.missing).toContain('ф');
  });
});
