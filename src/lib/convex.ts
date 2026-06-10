import { ConvexClient } from 'convex/browser';
import { PUBLIC_CONVEX_URL } from '$env/static/public';
import { api } from '../../convex/_generated/api';

if (!PUBLIC_CONVEX_URL) {
  throw new Error('PUBLIC_CONVEX_URL is not set — copy .env.example to .env.local and populate via `make convex`');
}

export const convex = new ConvexClient(PUBLIC_CONVEX_URL);
export { api };
