import { getIdleViewModel } from '@/lib/viewModel-builder';

import { HandsExtFixture } from './types';

export const idleFixture: HandsExtFixture = {
  input: undefined,
  expectedOutput: getIdleViewModel(),
};
