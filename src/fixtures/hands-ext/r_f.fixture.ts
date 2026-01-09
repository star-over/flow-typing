
import { HandsExtFixture } from './types';
export const r_f: HandsExtFixture = {
  input: {
  "targetSymbol": "r",
  "targetKeyCaps": ["KeyR"],
  "attempts": [ { "pressedKeyCups": ["KeyF"], "startAt": 1767971157516, "endAt": 1767971157516 },]
},
  expectedOutput: {
  "L1": {
    "fingerState": "IDLE"
  },
  "L2": {
    "fingerState": "ACTIVE",
    "keyCapStates": {
      "Digit4": {
        "visibility": "VISIBLE",
        "navigationRole": "NONE",
        "pressResult": "NEUTRAL",
        "navigationArrow": "NONE"
      },
      "Digit5": {
        "visibility": "VISIBLE",
        "navigationRole": "NONE",
        "pressResult": "NEUTRAL",
        "navigationArrow": "NONE"
      },
      "KeyR": {
        "visibility": "VISIBLE",
        "navigationRole": "TARGET",
        "pressResult": "NEUTRAL",
        "navigationArrow": "NONE"
      },
      "KeyT": {
        "visibility": "VISIBLE",
        "navigationRole": "NONE",
        "pressResult": "NEUTRAL",
        "navigationArrow": "NONE"
      },
      "KeyF": {
        "visibility": "VISIBLE",
        "navigationRole": "PATH",
        "pressResult": "INCORRECT",
        "navigationArrow": "UP"
      },
      "KeyG": {
        "visibility": "VISIBLE",
        "navigationRole": "NONE",
        "pressResult": "NEUTRAL",
        "navigationArrow": "NONE"
      },
      "KeyV": {
        "visibility": "VISIBLE",
        "navigationRole": "NONE",
        "pressResult": "NEUTRAL",
        "navigationArrow": "NONE"
      },
      "KeyB": {
        "visibility": "VISIBLE",
        "navigationRole": "NONE",
        "pressResult": "NEUTRAL",
        "navigationArrow": "NONE"
      }
    }
  },
  "L3": {
    "fingerState": "IDLE"
  },
  "L4": {
    "fingerState": "IDLE"
  },
  "L5": {
    "fingerState": "IDLE"
  },
  "LB": {
    "fingerState": "IDLE"
  },
  "R1": {
    "fingerState": "INACTIVE"
  },
  "R2": {
    "fingerState": "INACTIVE"
  },
  "R3": {
    "fingerState": "INACTIVE"
  },
  "R4": {
    "fingerState": "INACTIVE"
  },
  "R5": {
    "fingerState": "INACTIVE"
  },
  "RB": {
    "fingerState": "INACTIVE"
  }
},
};
