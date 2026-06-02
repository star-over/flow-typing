import { getIdleViewModel } from '@/lib/viewModel-builder';

import type { HandsExtFixture } from './types';

export const idle: HandsExtFixture = {
  input: undefined,
  expectedOutput: getIdleViewModel(),
};
