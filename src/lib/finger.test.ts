import { describe, expect,it } from "vitest";

import { getFingerLayout } from "@/lib/layouts";
import { getFingerByKeyCap, getFingerKeys } from "./finger";

const fingerLayoutASDF = getFingerLayout('asdf');

describe('getFingerKeys', () => {
  it('should return all keyCapIds for L2 (index finger left hand)', () => {
    const keys = getFingerKeys({ fingerId: 'L2', fingerLayout: fingerLayoutASDF });
    expect(keys).toEqual(expect.arrayContaining(['Digit4', 'Digit5', 'KeyR', 'KeyT', 'KeyF', 'KeyG', 'KeyV', 'KeyB']));
    expect(keys).toHaveLength(8);
  });

  it('should return all keyCapIds for R1 (thumb right hand)', () => {
    const keys = getFingerKeys({ fingerId: 'R1', fingerLayout: fingerLayoutASDF });
    expect(keys).toEqual(expect.arrayContaining(['Space']));
    expect(keys).toHaveLength(1);
  });

  it('should return an empty array for a finger with no assigned keys in fingerLayoutASDF', () => {
    // В fingerLayoutASDF для LB и RB нет назначенных клавиш.
    const lbCluster = getFingerKeys({ fingerId: 'LB', fingerLayout: fingerLayoutASDF });
    expect(lbCluster).toEqual([]);
    const rbCluster = getFingerKeys({ fingerId: 'RB', fingerLayout: fingerLayoutASDF });
    expect(rbCluster).toEqual([]);
  });
});

describe('getFingerByKeyCap', () => {
  it('should return the correct fingerId for a given KeyCapId', () => {
    expect(getFingerByKeyCap({ keyCapId: 'KeyA', fingerLayout: fingerLayoutASDF })).toBe('L5');
    expect(getFingerByKeyCap({ keyCapId: 'KeyJ', fingerLayout: fingerLayoutASDF })).toBe('R2');
    expect(getFingerByKeyCap({ keyCapId: 'Space', fingerLayout: fingerLayoutASDF })).toBe('R1');
  });

  it('should return undefined for a KeyCapId not in the finger layout', () => {
    expect(getFingerByKeyCap({ keyCapId: 'Unknown', fingerLayout: fingerLayoutASDF })).toBeUndefined();
  });
});
