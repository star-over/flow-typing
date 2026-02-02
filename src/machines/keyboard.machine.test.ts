import { describe, expect, it } from "vitest";
import { assign, createActor, createMachine, sendTo } from "xstate";

import { KeyCapId } from "@/interfaces/types"; // Import types from interfaces
import { keyboardLayoutANSI } from "@/data/layouts/keyboard-layout-ansi"; // Add this

import { keyboardMachine,KeyboardMachineEvent } from "./keyboard.machine";

// Test parent machine to receive events from the keyboard machine
const testParentMachine = createMachine({
  id: "testParent",
  initial: "active",
  context: {
    recognizedCharacterHistory: [] as KeyCapId[][],
    recognizedNavigationHistory: [] as KeyCapId[],
  },
  types: {} as {
    events:
      | { type: "KEY_DOWN"; keyCapId: KeyCapId }
      | { type: "KEY_UP"; keyCapId: KeyCapId }
      | { type: "RESET" }
      | { type: "KEYBOARD.CHARACTER_INPUT"; keys: KeyCapId[] }
      | { type: "KEYBOARD.NAVIGATION_KEY"; key: KeyCapId }
  },
  invoke: {
    id: "keyboard",
    src: keyboardMachine,
    input: ({ self }) => ({ 
      parentActor: self,
      keyboardLayout: keyboardLayoutANSI // Add this
    }), 
  },
  on: {
    KEY_DOWN: {
      actions: sendTo("keyboard", ({ event }) => ({
        type: "KEY_DOWN",
        keyCapId: event.keyCapId,
      })),
    },
    KEY_UP: {
      actions: sendTo("keyboard", ({ event }) => ({
        type: "KEY_UP",
        keyCapId: event.keyCapId,
      })),
    },
    RESET: {
      actions: sendTo("keyboard", { type: "RESET" }),
    },
    "KEYBOARD.CHARACTER_INPUT": {
      actions: assign({
        recognizedCharacterHistory: ({ context, event }) => [
          ...context.recognizedCharacterHistory,
          event.keys,
        ],
      }),
    },
    "KEYBOARD.NAVIGATION_KEY": {
      actions: assign({
        recognizedNavigationHistory: ({ context, event }) => [
          ...context.recognizedNavigationHistory,
          event.key,
        ],
      }),
    },
  },
  states: {
    active: {},
  },
});

describe("keyboardMachine", () => {
  it("should start in idle state with no pressed keys", () => {
    const actor = createActor(testParentMachine);
    actor.start();
    const keyboardSnapshot = actor.getSnapshot().children.keyboard!.getSnapshot();
    expect(keyboardSnapshot.value).toBe("idle");
    expect(keyboardSnapshot.context.pressedKeys.size).toBe(0);
  });

  it("should move to listening when a modifier key is pressed", () => new Promise<void>((resolve) => {
    const actor = createActor(testParentMachine);
    actor.start(); // Start the parent actor

    actor.subscribe((snapshot) => {
      // Check the child's state
      const keyboardSnapshot = snapshot.children.keyboard?.getSnapshot();
      if (keyboardSnapshot?.matches('listening')) {
        expect(keyboardSnapshot.context.pressedKeys.has("ShiftLeft")).toBe(true);
        expect(snapshot.context.recognizedCharacterHistory).toEqual([]);
        expect(snapshot.context.recognizedNavigationHistory).toEqual([]);
        resolve();
      }
    });
    actor.send({ type: "KEY_DOWN", keyCapId: "ShiftLeft" });
  }));

  it("should return to idle when the last key is released", () => {
    const actor = createActor(testParentMachine);
    actor.start();
    actor.send({ type: "KEY_DOWN", keyCapId: "ShiftLeft" });
    actor.send({ type: "KEY_UP", keyCapId: "ShiftLeft" });

    const keyboardSnapshot = actor.getSnapshot().children.keyboard!.getSnapshot();
    expect(keyboardSnapshot.value).toBe("idle");
    expect(keyboardSnapshot.context.pressedKeys.size).toBe(0);
  });

  it("should send CHARACTER_INPUT event when a text key is pressed", () => new Promise<void>((resolve) => {
    const actor = createActor(testParentMachine);
     actor.subscribe((snapshot) => {
      if (snapshot.context.recognizedCharacterHistory.length > 0) {
        const keyboardSnapshot = snapshot.children.keyboard!.getSnapshot();
        expect(keyboardSnapshot.value).toBe("idle"); // Now goes back to idle after sending
        expect(keyboardSnapshot.context.pressedKeys.size).toBe(0); // Keys are cleared after sending
        expect(snapshot.context.recognizedCharacterHistory).toEqual([["KeyA"]]);
        resolve();
      }
    });
    actor.start();
    actor.send({ type: "KEY_DOWN", keyCapId: "KeyA" });
  }));

  it("should send CHARACTER_INPUT event when a chord (modifier + key) is pressed", () => new Promise<void>((resolve) => {
    const actor = createActor(testParentMachine);
    actor.subscribe((snapshot) => {
        if (snapshot.context.recognizedCharacterHistory.length > 0) {
            const keyboardSnapshot = snapshot.children.keyboard!.getSnapshot();
            expect(keyboardSnapshot.value).toBe("idle"); // Now goes back to idle after sending
            expect(keyboardSnapshot.context.pressedKeys.size).toBe(0); // Keys are cleared after sending
            expect(snapshot.context.recognizedCharacterHistory).toEqual([expect.arrayContaining(["ShiftLeft", "KeyB"])]);
            resolve();
        }
    });
    actor.start();
    actor.send({ type: "KEY_DOWN", keyCapId: "ShiftLeft" });
    actor.send({ type: "KEY_DOWN", keyCapId: "KeyB" });
  }));


  it("should reset to idle state on RESET event", () => {
    const actor = createActor(testParentMachine);
    actor.start();
    actor.send({ type: "KEY_DOWN", keyCapId: "ControlLeft" });
    actor.send({ type: "KEY_DOWN", keyCapId: "KeyD" });
    actor.send({ type: "RESET" });
    const keyboardSnapshot = actor.getSnapshot().children.keyboard!.getSnapshot();
    expect(keyboardSnapshot.value).toBe("idle");
    expect(keyboardSnapshot.context.pressedKeys.size).toBe(0);
  });


  
  it("should send CHARACTER_INPUT event for Meta + key chord", () => new Promise<void>((resolve) => {
    const actor = createActor(testParentMachine);
    let step = 0; // The step variable is still needed for this multi-step test
    actor.subscribe((snapshot) => {
        if (step === 0 && snapshot.context.recognizedCharacterHistory.length > 0) {
            const keyboardSnapshot = snapshot.children.keyboard!.getSnapshot();
            expect(keyboardSnapshot.context.pressedKeys.size).toBe(0); // Cleared after send
            expect(snapshot.context.recognizedCharacterHistory[0]).toEqual(expect.arrayContaining(["MetaLeft", "KeyA"]));
            actor.send({ type: "KEY_UP", keyCapId: "MetaLeft" });
            step = 1;
        } else if (step === 1 && snapshot.children.keyboard!.getSnapshot().context.pressedKeys.size === 0) {
            const keyboardSnapshot = snapshot.children.keyboard!.getSnapshot();
            expect(keyboardSnapshot.context.pressedKeys.has("MetaLeft")).toBe(false);
            expect(keyboardSnapshot.context.pressedKeys.has("KeyA")).toBe(false);
            resolve();
        }
    });

    actor.start();
    actor.send({ type: "KEY_DOWN", keyCapId: "MetaLeft" });
    actor.send({ type: "KEY_DOWN", keyCapId: "KeyA" });
  }));

  it("should send NAVIGATION_KEY event when functional key (Escape) is pressed", () => new Promise<void>((resolve) => {
    const actor = createActor(testParentMachine);
    actor.subscribe((snapshot) => {
        if (snapshot.context.recognizedNavigationHistory.length > 0) {
            const keyboardSnapshot = snapshot.children.keyboard!.getSnapshot();
            expect(keyboardSnapshot.value).toBe("idle"); // Should go back to idle
            expect(keyboardSnapshot.context.pressedKeys.size).toBe(0); // Keys are cleared
            expect(snapshot.context.recognizedNavigationHistory).toEqual(["Escape"]);
            resolve();
        }
    });
    actor.start();
    actor.send({ type: "KEY_DOWN", keyCapId: "Escape" });
  }));

  it("should send CHARACTER_INPUT event for multiple modifier keys + text key chord", () => new Promise<void>((resolve) => {
    const actor = createActor(testParentMachine);
    // eslint-disable-next-line prefer-const
    let step = 0;
    actor.subscribe((snapshot) => {
        const keyboardSnapshot = snapshot.children.keyboard?.getSnapshot();
        if (step === 0 && snapshot.context.recognizedCharacterHistory.length > 0) {
            expect(keyboardSnapshot!.value).toBe("idle"); // Back to idle
            expect(keyboardSnapshot!.context.pressedKeys.size).toBe(0); // Keys are cleared
            expect(snapshot.context.recognizedCharacterHistory[0]).toEqual(
                expect.arrayContaining(["ControlLeft", "ShiftLeft", "AltLeft", "KeyD"])
            );
            resolve();
        }
    });

    actor.start();
    actor.send({ type: "KEY_DOWN", keyCapId: "ControlLeft" });
    actor.send({ type: "KEY_DOWN", keyCapId: "ShiftLeft" });
    actor.send({ type: "KEY_DOWN", keyCapId: "AltLeft" });
    actor.send({ type: "KEY_DOWN", keyCapId: "KeyD" });
  }));
});
