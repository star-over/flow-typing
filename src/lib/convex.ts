import { ConvexClient } from 'convex/browser';
import { on } from 'svelte/events';
import { PUBLIC_CONVEX_URL } from '$env/static/public';
import { dev } from '$app/environment';
import { api } from '../../convex/_generated/api';

if (!PUBLIC_CONVEX_URL) {
  throw new Error('PUBLIC_CONVEX_URL is not set — copy .env.example to .env.local and populate via `make convex`');
}

// В dev полный reload (рестарт vite / HMR-invalidate appActor) регулярно совпадает
// с летящей мутацией или refresh'ем токена, и защитные beforeunload-гарды Convex
// и convex-auth показывают «Reload site?». Терять в dev нечего — регистрируем свой
// обработчик первым (до создания клиента) и обрываем цепочку до их preventDefault.
// На production dev === false, и весь блок вырезается tree-shaking'ом — страховка остаётся.
if (dev && typeof window !== 'undefined') {
  on(window, 'beforeunload', (event) => event.stopImmediatePropagation(), { capture: true });
}

export const convex = new ConvexClient(PUBLIC_CONVEX_URL);
export { api };
