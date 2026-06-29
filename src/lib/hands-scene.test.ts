import { describe, expect, it } from 'vitest';

// Import all fixtures
import { idle } from '@/fixtures/hands-scene/idle';
import { shift_b } from '@/fixtures/hands-scene/shift_b';
import { shift_f } from '@/fixtures/hands-scene/shift_f';
import { shift_o } from '@/fixtures/hands-scene/shift_o';
import { shift_o_error_simple_o } from '@/fixtures/hands-scene/shift_o_error_simple_o';
import { shift_t_error_shift_n } from '@/fixtures/hands-scene/shift_t_error_shift_n';
import { simple_6 } from '@/fixtures/hands-scene/simple_6';
import { simple_e_error_shift_F } from '@/fixtures/hands-scene/simple_e_error_shift_F';
import { simple_e_error_simple_d } from '@/fixtures/hands-scene/simple_e_error_simple_d';
import { simple_e_error_space } from '@/fixtures/hands-scene/simple_e_error_space';
import { simple_k } from '@/fixtures/hands-scene/simple_k';
import { simple_k_error_simple_j } from '@/fixtures/hands-scene/simple_k_error_simple_j';
import { simple_r_error_simple_f } from '@/fixtures/hands-scene/simple_r_error_simple_f';
import { simple_space } from '@/fixtures/hands-scene/simple_space';
import { simple_t } from '@/fixtures/hands-scene/simple_t';

import { fingerLayout, keyboardGraph, keyCoordinateMap } from '@/fixtures/hands-scene/test-data';

import { createHandsSceneViewModel, sealHandsSceneViewModel } from './hands-scene';
import type { HandsSceneViewModelDraft } from './hands-scene';

describe('createHandsSceneViewModel', () => {

    it('should correctly generate view model for "Space"', () => {
    const {input, expectedOutput} = simple_space;
    const viewModel = createHandsSceneViewModel({
      currentStreamSymbol: input,
      fingerLayout,
      keyboardGraph,
      keyCoordinateMap,
    });
    expect(viewModel).toEqual(expectedOutput);
  });

    it('should correctly generate view model for "r" with pressed "f"', () => {
    const {input, expectedOutput} = simple_r_error_simple_f;
    const viewModel = createHandsSceneViewModel({
      currentStreamSymbol: input,
      fingerLayout,
      keyboardGraph,
      keyCoordinateMap,
    });
    expect(viewModel).toEqual(expectedOutput);
  });

    it('should correctly generate view model for "Shift-F"', () => {
    const {input, expectedOutput} = shift_f;
    const viewModel = createHandsSceneViewModel({
      currentStreamSymbol: input,
      fingerLayout,
      keyboardGraph,
      keyCoordinateMap,
    });
    expect(viewModel).toEqual(expectedOutput);
  });

    it('should correctly generate view model for "Shift-B"', () => {
    const {input, expectedOutput} = shift_b;
    const viewModel = createHandsSceneViewModel({
      currentStreamSymbol: input,
      fingerLayout,
      keyboardGraph,
      keyCoordinateMap,
    });
    expect(viewModel).toEqual(expectedOutput);
  });

    it('should correctly generate view model for "6"', () => {
    const {input, expectedOutput} = simple_6;
    const viewModel = createHandsSceneViewModel({
      currentStreamSymbol: input,
      fingerLayout,
      keyboardGraph,
      keyCoordinateMap,
    });
    expect(viewModel).toEqual(expectedOutput);
  });

    it('should correctly generate view model for "k" with pressed "j"', () => {
    const {input, expectedOutput} = simple_k_error_simple_j;
    const viewModel = createHandsSceneViewModel({
      currentStreamSymbol: input,
      fingerLayout,
      keyboardGraph,
      keyCoordinateMap,
    });
    expect(viewModel).toEqual(expectedOutput);
  });

    it('should correctly generate view model for "e" with pressed "d"', () => {
    const {input, expectedOutput} = simple_e_error_simple_d;
    const viewModel = createHandsSceneViewModel({
      currentStreamSymbol: input,
      fingerLayout,
      keyboardGraph,
      keyCoordinateMap,
    });
    expect(viewModel).toEqual(expectedOutput);
  });

    it('should correctly generate view model for "Shift-T" with pressed "Sift-N"', () => {
    const {input, expectedOutput} = shift_t_error_shift_n;
    const viewModel = createHandsSceneViewModel({
      currentStreamSymbol: input,
      fingerLayout,
      keyboardGraph,
      keyCoordinateMap,
    });
    expect(viewModel).toEqual(expectedOutput);
  });

    it('should correctly generate view model for "Shift-O" with pressed "o"', () => {
    const {input, expectedOutput} = shift_o_error_simple_o;
    const viewModel = createHandsSceneViewModel({
      currentStreamSymbol: input,
      fingerLayout,
      keyboardGraph,
      keyCoordinateMap,
    });
    expect(viewModel).toEqual(expectedOutput);
  });

    it('should correctly generate view model for "e" with pressed "Space"', () => {
    const {input, expectedOutput} = simple_e_error_space;
    const viewModel = createHandsSceneViewModel({
      currentStreamSymbol: input,
      fingerLayout,
      keyboardGraph,
      keyCoordinateMap,
    });
    expect(viewModel).toEqual(expectedOutput);
  });

  it('should return the idle view model when symbol is undefined', () => {
    const {input, expectedOutput} = idle;
    const viewModel = createHandsSceneViewModel({
      currentStreamSymbol: input,
      fingerLayout,
      keyboardGraph,
      keyCoordinateMap,
    });
    expect(viewModel).toEqual(expectedOutput);
  });

  it('should correctly generate view model for "Shift-O"', () => {
    const {input, expectedOutput} = shift_o;
    const viewModel = createHandsSceneViewModel({
      currentStreamSymbol: input,
      fingerLayout,
      keyboardGraph,
      keyCoordinateMap,
    });
    expect(viewModel).toEqual(expectedOutput);
  });

  it('should correctly generate view model for "e" with pressed "Shift-F"', () => {
    const {input, expectedOutput} = simple_e_error_shift_F;
    const viewModel = createHandsSceneViewModel({
      currentStreamSymbol: input,
      fingerLayout,
      keyboardGraph,
      keyCoordinateMap,
    });
    expect(viewModel).toEqual(expectedOutput);
  });

  it('should correctly generate view model for "t"', () => {
    const viewModel = createHandsSceneViewModel({
      currentStreamSymbol: simple_t.input,
      fingerLayout,
      keyboardGraph,
      keyCoordinateMap,
    });
    expect(viewModel).toEqual(simple_t.expectedOutput);
  });

  it('should correctly generate view model for simple "k"', () => {
    const viewModel = createHandsSceneViewModel({
      currentStreamSymbol: simple_k.input,
      fingerLayout,
      keyboardGraph,
      keyCoordinateMap,
    });
    expect(viewModel).toEqual(simple_k.expectedOutput);
  });
});

describe('sealHandsSceneViewModel (правило «Полного Кластера»)', () => {
  // simple_k: R3 — TARGET (с keyCapStates), L1 — NONE (без). Ломаем по одному инвариант.
  const validDraft = (): HandsSceneViewModelDraft =>
    structuredClone(simple_k.expectedOutput);

  it('returns the model unchanged when the invariant holds', () => {
    expect(sealHandsSceneViewModel(validDraft())).toEqual(simple_k.expectedOutput);
  });

  it('throws when a TARGET finger has no keyCapStates', () => {
    const draft = validDraft();
    delete draft.R3.keyCapStates;
    expect(() => sealHandsSceneViewModel(draft)).toThrow(/R3/);
  });

  it('throws when a non-TARGET finger carries keyCapStates', () => {
    const draft = validDraft();
    draft.L1.keyCapStates = {};
    expect(() => sealHandsSceneViewModel(draft)).toThrow(/L1/);
  });
});
