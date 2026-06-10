import type { Doc } from '../../../convex/_generated/dataModel';

export type User = Doc<'users'>;

export type AuthState =
  | { status: 'loading' }
  | { status: 'authenticated'; user: User }
  | { status: 'guest' };
