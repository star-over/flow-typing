import { ConvexClient } from 'convex/browser';

const CONVEX_URL = import.meta.env.VITE_CONVEX_URL;

if (!CONVEX_URL) {
  throw new Error('VITE_CONVEX_URL is not defined');
}

export const convex = new ConvexClient(CONVEX_URL);
