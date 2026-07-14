/**
 * @file Чистые проверки диапазонов входных чисел мутаций (P0-10, anti-abuse).
 *
 * Convex `v.number()` проверяет только «это число», НЕ диапазон и НЕ конечность:
 * NaN / Infinity / отрицательные / гигантские значения проходят валидатор формы и
 * фабрикуют статистику (мусор в `sessionSummaries` / `skillProfiles`, кривой /stats,
 * отравление будущей калибровки движка). Эти ассерты — второй слой поверх формы:
 * бросают при выходе за инвариант домена. Чистые (без ctx) → юнит-тест напрямую
 * (паттерн `createOrUpdateUserHandler` / инлайн-проверки `setMyOpenedStepsHandler`).
 *
 * Работают на ВСЕХ деплоях — это универсальный харденинг, не dev-гейт (ADR 0023 /
 * `isProduction()` тут ни при чём).
 *
 * Потолки — числа-настройки (политика плана «Числа-настройки»: не в ADR, а
 * константами в коде). Взяты со щедрым headroom над физически достижимым: цель —
 * отсечь «гигантские»/отрицательные фабрикации, а не легитимные данные.
 */

const MAX_EXPOSURES = 1_000_000; // 15-мин сессия ≈ ≤25k предъявлений; ~40× запас
const MAX_CPM = 5_000; // мировой рекорд ≈ 1000 cpm; 5× запас
const MAX_DURATION_MS = 3_600_000; // окно сессии ≤ 900 c; 1 ч с запасом на дрейф часов
const MAX_LATENCY_MS = 60_000; // клиент кэпит интервалы 1500 мс (PAUSE_CAP_MS); 40× запас
const MAX_RHYTHM = 100; // ровность ритма — процент [0,100]

const MAX_DISPLAY_NAME_LENGTH = 100; // имя рядом с аватаром; кэп против storage-abuse
// Диапазон длительности сессии = размах SESSION_DURATION_OPTIONS (src/lib/settings).
// Проверяем диапазон, не точное членство: инвариант anti-abuse — «не отрицательная,
// не годовая», а не связывать сервер со списком клиентских опций.
const MIN_SESSION_DURATION_SECONDS = 60;
const MAX_SESSION_DURATION_SECONDS = 900;

/** Неотрицательное целое в [0, max] — для счётчиков (предъявления, промахи). */
function assertNonNegativeInt({ value, max, label }: { value: number; max: number; label: string }): void {
  if (!Number.isInteger(value) || value < 0 || value > max) {
    throw new Error(`${label} must be an integer in [0, ${max}], got ${value}`);
  }
}

/** Неотрицательное конечное число в [0, max] — для дробных метрик (cpm, латентность). */
function assertNonNegativeFinite({ value, max, label }: { value: number; max: number; label: string }): void {
  if (!Number.isFinite(value) || value < 0 || value > max) {
    throw new Error(`${label} must be a finite number in [0, ${max}], got ${value}`);
  }
}

/**
 * Валидация сводки `sessions.record` (все поля персистятся → все проверяются).
 * `rhythm` optional — проверяется только если передан.
 */
export function assertValidSessionSummary(summary: {
  exposures: number;
  clean: number;
  cpm: number;
  durationMs: number;
  latencyMedianMs: number;
  rhythm?: number;
  confusions: { count: number }[];
}): void {
  assertNonNegativeInt({ value: summary.exposures, max: MAX_EXPOSURES, label: 'exposures' });
  assertNonNegativeInt({ value: summary.clean, max: MAX_EXPOSURES, label: 'clean' });
  if (summary.clean > summary.exposures) {
    throw new Error(`clean (${summary.clean}) must not exceed exposures (${summary.exposures})`);
  }
  assertNonNegativeFinite({ value: summary.cpm, max: MAX_CPM, label: 'cpm' });
  assertNonNegativeFinite({ value: summary.durationMs, max: MAX_DURATION_MS, label: 'durationMs' });
  assertNonNegativeFinite({ value: summary.latencyMedianMs, max: MAX_LATENCY_MS, label: 'latencyMedianMs' });
  if (summary.rhythm !== undefined) {
    assertNonNegativeFinite({ value: summary.rhythm, max: MAX_RHYTHM, label: 'rhythm' });
  }
  for (const confusion of summary.confusions) {
    assertNonNegativeInt({ value: confusion.count, max: MAX_EXPOSURES, label: 'confusion count' });
  }
}

/**
 * Валидация `perSymbol` payload'а `drillRecord`. Только perSymbol персистится в
 * профиль (overall принимается, но не хранится — drill.ts) → его и проверяем.
 */
export function assertValidDrillPerSymbol(
  perSymbol: { exposures: number; clean: number; latencies: number[] }[]
): void {
  for (const stat of perSymbol) {
    assertNonNegativeInt({ value: stat.exposures, max: MAX_EXPOSURES, label: 'perSymbol exposures' });
    assertNonNegativeInt({ value: stat.clean, max: MAX_EXPOSURES, label: 'perSymbol clean' });
    if (stat.clean > stat.exposures) {
      throw new Error(`perSymbol clean (${stat.clean}) must not exceed exposures (${stat.exposures})`);
    }
    for (const latency of stat.latencies) {
      assertNonNegativeFinite({ value: latency, max: MAX_LATENCY_MS, label: 'perSymbol latency' });
    }
  }
}

/**
 * Валидация числовых/строковых диапазонов payload'а `upsertMine`. Enum-поля
 * (язык, раскладка, тема) НЕ проверяем: гарбадж в них — самовред юзера (влияет
 * только на его же опыт), не abuse. Проверяем то, что реально злоупотребимо:
 * длину `displayName` (storage-abuse, рендерится в UI) и диапазон длительности
 * сессии.
 */
export function assertValidSettingsInput(settings: {
  displayName: string;
  sessionDurationSeconds: number;
}): void {
  if (settings.displayName.length > MAX_DISPLAY_NAME_LENGTH) {
    throw new Error(
      `displayName too long (${settings.displayName.length} > ${MAX_DISPLAY_NAME_LENGTH})`
    );
  }
  if (
    !Number.isFinite(settings.sessionDurationSeconds) ||
    settings.sessionDurationSeconds < MIN_SESSION_DURATION_SECONDS ||
    settings.sessionDurationSeconds > MAX_SESSION_DURATION_SECONDS
  ) {
    throw new Error(
      `sessionDurationSeconds out of range [${MIN_SESSION_DURATION_SECONDS}, ${MAX_SESSION_DURATION_SECONDS}], got ${settings.sessionDurationSeconds}`
    );
  }
}
