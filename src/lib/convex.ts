import { ConvexClient } from 'convex/browser';
import { PUBLIC_CONVEX_URL } from '$env/static/public';
import { api } from '../../convex/_generated/api';

export const convex = new ConvexClient(PUBLIC_CONVEX_URL);
export { api };
