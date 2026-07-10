import type { HandleClientError } from '@sveltejs/kit';
import { convex, api } from '@/lib/convex';
import { toErrorReport } from '@/lib/error-report';

/**
 * Глобальный перехват непойманных клиентских ошибок (навигация/рендер SvelteKit).
 * Наблюдаемость-минимум (P0-7): в production шлём отчёт в Convex-канал
 * (`clientErrors.report`) — замену внешнему error-tracking'у (Sentry недоступен
 * владельцу в РФ + приватность-бренд; см. `convex/clientErrors.ts`). Best-effort
 * at-most-once: сбой отправки не должен маскировать исходную ошибку — гасим молча.
 * В dev телеметрию НЕ шлём, только console — чтобы сбой не пропадал и не засорял
 * таблицу. Возвращённый `message` становится `page.error.message` для `+error.svelte`.
 */
export const handleError: HandleClientError = ({ error, message, event }) => {
  if (import.meta.env.DEV) {
    console.error('[handleError]', error);
    return { message };
  }
  try {
    const report = toErrorReport(error, event?.url?.pathname);
    void convex
      .mutation(api.clientErrors.report, {
        ...report,
        ...(typeof navigator !== 'undefined' && navigator.userAgent
          ? { userAgent: navigator.userAgent }
          : {}),
      })
      .catch(() => {
        /* at-most-once: офлайн/сбой сети — молча гасим */
      });
  } catch {
    /* отчёт никогда не должен уронить handleError */
  }
  return { message };
};
