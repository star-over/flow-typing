/**
 * @file Чистое ядро наблюдаемости (P0-7): нормализация непойманной ошибки в
 * payload отчёта. Отделено от `hooks.client.ts` (который тянет convex-singleton с
 * side-эффектами) — чтобы логику извлечения можно было юнит-тестировать без сети,
 * как `settings-sync.ts` отделён от `settings.ts`.
 */

export interface ClientErrorReport {
  message: string;
  stack?: string;
  url?: string;
}

/** Извлекает message/stack из произвольного значения ошибки. */
export function toErrorReport(error: unknown, url: string | undefined): ClientErrorReport {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  return { message: message || 'Unknown error', stack, url };
}
