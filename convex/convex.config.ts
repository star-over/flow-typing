import { defineApp } from 'convex/server';
import aggregate from '@convex-dev/aggregate/convex.config.js';
import rateLimiter from '@convex-dev/rate-limiter/convex.config.js';

const app = defineApp();
// Инстанс агрегата над drillSelectionIndex (ADR 0009). Имя → ключ в components.
app.use(aggregate, { name: 'drillIndex' });
// Per-user rate limiting писательских мутаций (P0-10, anti-abuse). Инстанс — convex/rateLimiter.ts.
app.use(rateLimiter);
export default app;
