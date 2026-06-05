import { createIdleViewModel } from '@/lib/hands-scene';

import type { HandsExtFixture } from './types';

export const idle: HandsExtFixture = {
  input: undefined,
  expectedOutput: createIdleViewModel(),
};
