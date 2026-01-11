import { describe, expect, it } from 'vitest';

// Import all fixtures
import { idle } from '@/fixtures/hands-ext/idle';
import { shift_b } from '@/fixtures/hands-ext/shift_b';
import { shift_f } from '@/fixtures/hands-ext/shift_f';
import { shift_o } from '@/fixtures/hands-ext/shift_o';
import { shift_o_error_simple_o } from '@/fixtures/hands-ext/shift_o_error_simple_o';
import { shift_t_error_shift_n } from '@/fixtures/hands-ext/shift_t_error_shift_n';
import { simple_6 } from '@/fixtures/hands-ext/simple_6';
import { simple_e_error_shift_F } from '@/fixtures/hands-ext/simple_e_error_shift_F';
import { simple_e_error_simple_d } from '@/fixtures/hands-ext/simple_e_error_simple_d';
import { simple_e_error_space } from '@/fixtures/hands-ext/simple_e_error_space';
import { simple_k } from '@/fixtures/hands-ext/simple_k';
import { simple_k_error_simple_j } from '@/fixtures/hands-ext/simple_k_error_simple_j';
import { simple_r_error_simple_f } from '@/fixtures/hands-ext/simple_r_error_simple_f';
import { simple_space } from '@/fixtures/hands-ext/simple_space';
import { simple_t } from '@/fixtures/hands-ext/simple_t';

import { fingerLayout, keyboardGraph, keyCoordinateMap, keyboardLayout } from '@/fixtures/hands-ext/test-data';

import { generateHandsSceneViewModel, generateVirtualLayoutForFinger } from './viewModel-builder';

describe('generateHandsSceneViewModel', () => {

    it('should correctly generate view model for "Space"', () => {
    const {input, expectedOutput} = simple_space;
    const viewModel = generateHandsSceneViewModel(
      input,
      fingerLayout,
      keyboardGraph,
      keyCoordinateMap
    );
    expect(viewModel).toEqual(expectedOutput);
  });

    it('should correctly generate view model for "r" with pressed "f"', () => {
    const {input, expectedOutput} = simple_r_error_simple_f;
    const viewModel = generateHandsSceneViewModel(
      input,
      fingerLayout,
      keyboardGraph,
      keyCoordinateMap
    );
    expect(viewModel).toEqual(expectedOutput);
  });

    it('should correctly generate view model for "Shift-F"', () => {
    const {input, expectedOutput} = shift_f;
    const viewModel = generateHandsSceneViewModel(
      input,
      fingerLayout,
      keyboardGraph,
      keyCoordinateMap
    );
    expect(viewModel).toEqual(expectedOutput);
  });

    it('should correctly generate view model for "Shift-B"', () => {
    const {input, expectedOutput} = shift_b;
    const viewModel = generateHandsSceneViewModel(
      input,
      fingerLayout,
      keyboardGraph,
      keyCoordinateMap
    );
    expect(viewModel).toEqual(expectedOutput);
  });

    it('should correctly generate view model for "6"', () => {
    const {input, expectedOutput} = simple_6;
    const viewModel = generateHandsSceneViewModel(
      input,
      fingerLayout,
      keyboardGraph,
      keyCoordinateMap
    );
    expect(viewModel).toEqual(expectedOutput);
  });

    it('should correctly generate view model for "k" with pressed "j"', () => {
    const {input, expectedOutput} = simple_k_error_simple_j;
    const viewModel = generateHandsSceneViewModel(
      input,
      fingerLayout,
      keyboardGraph,
      keyCoordinateMap
    );
    expect(viewModel).toEqual(expectedOutput);
  });

    it('should correctly generate view model for "e" with pressed "d"', () => {
    const {input, expectedOutput} = simple_e_error_simple_d;
    const viewModel = generateHandsSceneViewModel(
      input,
      fingerLayout,
      keyboardGraph,
      keyCoordinateMap
    );
    expect(viewModel).toEqual(expectedOutput);
  });

    it('should correctly generate view model for "Shift-T" with pressed "Sift-N"', () => {
    const {input, expectedOutput} = shift_t_error_shift_n;
    const viewModel = generateHandsSceneViewModel(
      input,
      fingerLayout,
      keyboardGraph,
      keyCoordinateMap
    );
    expect(viewModel).toEqual(expectedOutput);
  });

    it('should correctly generate view model for "Shift-O" with pressed "o"', () => {
    const {input, expectedOutput} = shift_o_error_simple_o;
    const viewModel = generateHandsSceneViewModel(
      input,
      fingerLayout,
      keyboardGraph,
      keyCoordinateMap
    );
    expect(viewModel).toEqual(expectedOutput);
  });

    it('should correctly generate view model for "e" with pressed "Space"', () => {
    const {input, expectedOutput} = simple_e_error_space;
    const viewModel = generateHandsSceneViewModel(
      input,
      fingerLayout,
      keyboardGraph,
      keyCoordinateMap
    );
    expect(viewModel).toEqual(expectedOutput);
  });

  it('should return the idle view model when symbol is undefined', () => {
    const {input, expectedOutput} = idle;
    const viewModel = generateHandsSceneViewModel(
      input,
      fingerLayout,
      keyboardGraph,
      keyCoordinateMap
    );
    expect(viewModel).toEqual(expectedOutput);
  });

  it('should correctly generate view model for "Shift-O"', () => {
    const {input, expectedOutput} = shift_o;
    const viewModel = generateHandsSceneViewModel(
      input,
      fingerLayout,
      keyboardGraph,
      keyCoordinateMap
    );
    expect(viewModel).toEqual(expectedOutput);
  });

  it('should correctly generate view model for "e" with pressed "Shift-F"', () => {
    const {input, expectedOutput} = simple_e_error_shift_F;
    const viewModel = generateHandsSceneViewModel(
      input,
      fingerLayout,
      keyboardGraph,
      keyCoordinateMap
    );
    expect(viewModel).toEqual(expectedOutput);
  });

  it('should correctly generate view model for "t"', () => {
    const viewModel = generateHandsSceneViewModel(
      simple_t.input,
      fingerLayout,
      keyboardGraph,
      keyCoordinateMap
    );
    expect(viewModel).toEqual(simple_t.expectedOutput);
  });

  it('should correctly generate view model for simple "k"', () => {
    const viewModel = generateHandsSceneViewModel(
      simple_k.input,
      fingerLayout,
      keyboardGraph,
      keyCoordinateMap
    );
    expect(viewModel).toEqual(simple_k.expectedOutput);
  });
});

describe('generateVirtualLayoutForFinger', () => {
  it('should create a contextual layout for a specific finger', () => {
    // 1. Arrange
    // We use the expected output from a known fixture as the input for our function.
    const viewModel = simple_t.expectedOutput;
    const targetFinger = 'L2';

    // 2. Act
    const virtualLayout = generateVirtualLayoutForFinger(targetFinger, viewModel, fingerLayout, keyboardLayout);

    // 3. Assert
    // Helper function to find a key in the generated layout
    const findKey = (keyCapId: string) =>
      virtualLayout.flat().find((k) => k.keyCapId === keyCapId);

    // Check visibility: Only keys for finger L2 should be visible.
    const visibleKeys = virtualLayout.flat().filter((k) => k.visibility === 'VISIBLE');
    const l2Keys = Object.keys(viewModel.L2.keyCapStates!);
    expect(visibleKeys.length).toBe(l2Keys.length);
    visibleKeys.forEach((key) => {
      expect(l2Keys).toContain(key.keyCapId);
    });

    // Check roles for specific keys
    const keyT = findKey('KeyT');
    expect(keyT?.navigationRole).toBe('TARGET');

    const keyR = findKey('KeyR');
    expect(keyR?.navigationRole).toBe('PATH');

    const keyF = findKey('KeyF');
    expect(keyF?.navigationRole).toBe('PATH');

    // Check a key in the cluster that is not on the path
    const keyG = findKey('KeyG');
    expect(keyG?.navigationRole).toBe('NONE');

    // Check a key outside the cluster
    const keyA = findKey('KeyA');
    expect(keyA?.visibility).toBe('INVISIBLE');
  });
});
