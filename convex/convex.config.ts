import { defineApp } from 'convex/server';
import aggregate from '@convex-dev/aggregate/convex.config.js';

const app = defineApp();
// Инстанс агрегата над drillSelectionIndex (ADR 0009). Имя → ключ в components.
app.use(aggregate, { name: 'drillIndex' });
export default app;
