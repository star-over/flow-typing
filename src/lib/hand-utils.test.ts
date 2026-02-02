import { describe, expect,it } from "vitest";

import { fingerLayoutASDF } from "../data/layouts/finger-layout-asdf";
import { FingerLayout, HandStates, KeyCapId, SymbolLayout } from "../interfaces/types";
import { getFingerKeys, getHomeKeyForFinger, isLeftHandFinger } from "./hand-utils";

describe('getFingerKeys', () => {
  it('should return all keyCapIds for L2 (index finger left hand)', () => {
    const keys = getFingerKeys('L2', fingerLayoutASDF);
    expect(keys).toEqual(expect.arrayContaining(['Digit4', 'Digit5', 'KeyR', 'KeyT', 'KeyF', 'KeyG', 'KeyV', 'KeyB']));
    expect(keys).toHaveLength(8);
  });

  it('should return all keyCapIds for R1 (thumb right hand)', () => {
    const keys = getFingerKeys('R1', fingerLayoutASDF);
    expect(keys).toEqual(expect.arrayContaining(['Space']));
    expect(keys).toHaveLength(1);
  });

  it('should return an empty array for a finger with no assigned keys in fingerLayoutASDF', () => {
    // В fingerLayoutASDF для LB и RB нет назначенных клавиш.
    const lbCluster = getFingerKeys('LB', fingerLayoutASDF);
    expect(lbCluster).toEqual([]);
    const rbCluster = getFingerKeys('RB', fingerLayoutASDF);
    expect(rbCluster).toEqual([]);
  });
});
