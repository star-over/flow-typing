import type { HandsSceneViewModel, StreamSymbol } from '@/interfaces/types';

export interface HandsSceneFixture {
  input: StreamSymbol | undefined;
  expectedOutput: HandsSceneViewModel;
}