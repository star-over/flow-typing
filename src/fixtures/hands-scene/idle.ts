import { createIdleViewModel } from '@/lib/hands-scene';

import type { HandsSceneFixture } from './types';

export const idle: HandsSceneFixture = {
  input: undefined,
  expectedOutput: createIdleViewModel(),
};
