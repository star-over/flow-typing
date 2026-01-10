import { describe, expect,it } from 'vitest';

// Import all fixtures
import { idleFixture } from             '@/fixtures/hands-ext/idle.fixture';
import { simple_e_error_shift_F } from   '@/fixtures/hands-ext/simple_e_error_shift_F.fixture';
import { shift_o } from                 '@/fixtures/hands-ext/shift_o.fixture';
import { t } from                   '@/fixtures/hands-ext/t.fixture';
import { k } from                   '@/fixtures/hands-ext/simple-k.fixture';
import { k_j } from                 '@/fixtures/hands-ext/k_j.fixture';
import { r_f } from                 '@/fixtures/hands-ext/r_f.fixture';
import { shiftCurlyBraceFixture } from '@/fixtures/hands-ext/shift-curly-brace.fixture';
import { shiftDFixture } from       '@/fixtures/hands-ext/shift-d.fixture';
import { shiftFFixture } from       '@/fixtures/hands-ext/shift-f.fixture';
import { shiftPlusFixture } from    '@/fixtures/hands-ext/shift-plus.fixture';
import { shiftQuoteFixture } from   '@/fixtures/hands-ext/shift-quote.fixture';
import { simple2Fixture } from      '@/fixtures/hands-ext/simple-2.fixture';
import { simpleCFixture } from      '@/fixtures/hands-ext/simple-c.fixture';
import { simpleNFixture } from      '@/fixtures/hands-ext/simple-n.fixture';
import { spaceFixture } from        '@/fixtures/hands-ext/space.fixture';
import { fingerLayout, keyboardGraph, keyboardLayout, keyCoordinateMap } from '@/fixtures/hands-ext/test-data';

import { generateHandsSceneViewModel } from './viewModel-builder';


describe('generateHandsSceneViewModel', () => {

  it.only('should return the idle view model when currentStreamSymbol is undefined', () => {
    const viewModel = generateHandsSceneViewModel(
      idleFixture.input,
      fingerLayout,
      keyboardLayout,
      keyboardGraph,
      keyCoordinateMap
    );
    expect(viewModel).toEqual(idleFixture.expectedOutput);
  });

  it.only('should correctly generate view model for Shift+O', () => {
    const {input, expectedOutput} = shift_o;
    const viewModel = generateHandsSceneViewModel(
      input,
      fingerLayout,
      keyboardLayout,
      keyboardGraph,
      keyCoordinateMap
    );
    expect(viewModel).toEqual(expectedOutput);
  });

  it.only('should correctly generate view model for simple e with pressed Shift+F', () => {
    const {input, expectedOutput} = simple_e_error_shift_F;
    const viewModel = generateHandsSceneViewModel(
      input,
      fingerLayout,
      keyboardLayout,
      keyboardGraph,
      keyCoordinateMap
    );
    expect(viewModel).toEqual(expectedOutput);
  });

  it.only('should correctly generate view model for simple T', () => {
    const viewModel = generateHandsSceneViewModel(
      t.input,
      fingerLayout,
      keyboardLayout,
      keyboardGraph,
      keyCoordinateMap
    );
    expect(viewModel).toEqual(t.expectedOutput);
  });

  it.only('should correctly generate view model for simple K', () => {
    const viewModel = generateHandsSceneViewModel(
      k.input,
      fingerLayout,
      keyboardLayout,
      keyboardGraph,
      keyCoordinateMap
    );
    expect(viewModel).toEqual(k.expectedOutput);
  });

  it.skip('should correctly generate view model for simple N', () => {
    const viewModel = generateHandsSceneViewModel(
      simpleNFixture.input,
      fingerLayout,
      keyboardLayout,
      keyboardGraph,
      keyCoordinateMap
    );
    expect(viewModel).toEqual(simpleNFixture.expectedOutput);
  });

  it.skip('should correctly generate view model for simple C', () => {
    const viewModel = generateHandsSceneViewModel(
      simpleCFixture.input,
      fingerLayout,
      keyboardLayout,
      keyboardGraph,
      keyCoordinateMap
    );
    expect(viewModel).toEqual(simpleCFixture.expectedOutput);
  });

  it.skip('should correctly generate view model for simple 2', () => {
    const viewModel = generateHandsSceneViewModel(
      simple2Fixture.input,
      fingerLayout,
      keyboardLayout,
      keyboardGraph,
      keyCoordinateMap
    );
    expect(viewModel).toEqual(simple2Fixture.expectedOutput);
  });

  it.skip('should correctly generate view model for Shift F', () => {
    const viewModel = generateHandsSceneViewModel(
      shiftFFixture.input,
      fingerLayout,
      keyboardLayout,
      keyboardGraph,
      keyCoordinateMap
    );
    expect(viewModel).toEqual(shiftFFixture.expectedOutput);
  });

  it.skip('should correctly generate view model for simple K with error simple J', () => {
    const viewModel = generateHandsSceneViewModel(
      k_j.input,
      fingerLayout,
      keyboardLayout,
      keyboardGraph,
      keyCoordinateMap
    );
    expect(viewModel).toEqual(k_j.expectedOutput);
  });

  it.skip('should correctly generate view model for simple R with error simple F', () => {
    const viewModel = generateHandsSceneViewModel(
      r_f.input,
      fingerLayout,
      keyboardLayout,
      keyboardGraph,
      keyCoordinateMap
    );
    expect(viewModel).toEqual(r_f.expectedOutput);
  });

  it.skip('should correctly generate view model for Space', () => {
    const viewModel = generateHandsSceneViewModel(
      spaceFixture.input,
      fingerLayout,
      keyboardLayout,
      keyboardGraph,
      keyCoordinateMap
    );
    expect(viewModel).toEqual(spaceFixture.expectedOutput);
  });

  it.skip('should correctly generate view model for Shift D', () => {
    const viewModel = generateHandsSceneViewModel(
      shiftDFixture.input,
      fingerLayout,
      keyboardLayout,
      keyboardGraph,
      keyCoordinateMap
    );
    expect(viewModel).toEqual(shiftDFixture.expectedOutput);
  });

  it.skip('should correctly generate view model for Shift Plus', () => {
    const viewModel = generateHandsSceneViewModel(
      shiftPlusFixture.input,
      fingerLayout,
      keyboardLayout,
      keyboardGraph,
      keyCoordinateMap
    );
    expect(viewModel).toEqual(shiftPlusFixture.expectedOutput);
  });

  it.skip('should correctly generate view model for Shift Curly Brace', () => {
    const viewModel = generateHandsSceneViewModel(
      shiftCurlyBraceFixture.input,
      fingerLayout,
      keyboardLayout,
      keyboardGraph,
      keyCoordinateMap
    );
    expect(viewModel).toEqual(shiftCurlyBraceFixture.expectedOutput);
  });

  it.skip('should correctly generate view model for Shift Quote', () => {
    const viewModel = generateHandsSceneViewModel(
      shiftQuoteFixture.input,
      fingerLayout,
      keyboardLayout,
      keyboardGraph,
      keyCoordinateMap
    );
    expect(viewModel).toEqual(shiftQuoteFixture.expectedOutput);
  });
});
