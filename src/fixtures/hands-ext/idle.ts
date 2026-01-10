import { getIdleViewModel } from '@/lib/viewModel-builder';

import { HandsExtFixture } from './types';

export const idle: HandsExtFixture = {
  input: undefined,
  expectedOutput: getIdleViewModel(),
};
