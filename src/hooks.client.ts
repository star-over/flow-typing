import type { HandleClientError } from '@sveltejs/kit';

/**
 * Глобальный перехват непойманных клиентских ошибок (навигация/рендер SvelteKit).
 * Это же — ШОВ для error-tracking (Sentry, задача наблюдаемости P0-7): сюда позже
 * воткнётся отправка отчёта. Телеметрию тут НЕ пишем — только dev-лог, чтобы сбой
 * не пропадал молча; в production консоль тиха. Возвращённый `message` становится
 * `page.error.message` для `src/routes/+error.svelte`.
 */
export const handleError: HandleClientError = ({ error, message }) => {
  if (import.meta.env.DEV) {
    console.error('[handleError]', error);
  }
  return { message };
};
