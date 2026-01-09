import { HandsSceneViewModel, StreamSymbol } from '@/interfaces/types';

export interface HandsExtFixture {
  input: StreamSymbol | undefined;
  expectedOutput: HandsSceneViewModel;
}