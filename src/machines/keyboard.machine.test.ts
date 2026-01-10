import { describe, expect, it } from "vitest";
import { assign, createActor, createMachine, sendTo } from "xstate";

import { KeyCapId } from "@/interfaces/types"; // Import types from interfaces

import { keyboardMachine,KeyboardMachineEvent } from "./keyboard.machine";

// Test parent machine to receive events from the keyboard machine
const testParentMachine = createMachine({
  id: "testParent",
  initial: "active",
  context: {
    recognizedKeyHistory: [] as KeyCapId[][], // Change to history
  },
  types: {} as { events: { type: "KEY_DOWN"; keyCapId: KeyCapId } | { type: "KEY_UP"; keyCapId: KeyCapId } | { type: "RESET" } | { type: "KEYBOARD.RECOGNIZED"; keys: KeyCapId[] } },
  invoke: {
    id: "keyboard",
    src: keyboardMachine,
    input: ({ self }) => ({ parentActor: self }), // Pass the testParentMachine's actor reference
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
    "KEYBOARD.RECOGNIZED": {
      actions: assign({
        recognizedKeyHistory: ({ context, event }) => [
          ...context.recognizedKeyHistory,
          event.keys,
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
        // The parent should not have recognized anything
        expect(snapshot.context.recognizedKeyHistory).toEqual([]);
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

  it("should send RECOGNIZED event when a text key is pressed", () => new Promise<void>((resolve) => {
    const actor = createActor(testParentMachine);
     actor.subscribe((snapshot) => {
      if (snapshot.context.recognizedKeyHistory.length > 0) {
        const keyboardSnapshot = snapshot.children.keyboard!.getSnapshot();
        expect(keyboardSnapshot.value).toBe("listening");
        expect(keyboardSnapshot.context.pressedKeys.has("KeyA")).toBe(true);
        expect(snapshot.context.recognizedKeyHistory).toEqual([["KeyA"]]);
        resolve();
      }
    });
    actor.start();
    actor.send({ type: "KEY_DOWN", keyCapId: "KeyA" });
  }));

  it("should recognize a chord (modifier + key)", () => new Promise<void>((resolve) => {
    const actor = createActor(testParentMachine);
    actor.subscribe((snapshot) => {
        if (snapshot.context.recognizedKeyHistory.length > 0) {
            const keyboardSnapshot = snapshot.children.keyboard!.getSnapshot();
            expect(keyboardSnapshot.value).toBe("listening");
            expect(keyboardSnapshot.context.pressedKeys.size).toBe(2);
            expect(keyboardSnapshot.context.pressedKeys.has("ShiftLeft")).toBe(true);
            expect(keyboardSnapshot.context.pressedKeys.has("KeyB")).toBe(true);
            expect(snapshot.context.recognizedKeyHistory).toEqual([expect.arrayContaining(["ShiftLeft", "KeyB"])]);
            resolve();
        }
    });
    actor.start();
    actor.send({ type: "KEY_DOWN", keyCapId: "ShiftLeft" });
    actor.send({ type: "KEY_DOWN", keyCapId: "KeyB" });
  }));

  it("should clear non-modifier keys when Meta is released", () => new Promise<void>((resolve) => {
    const actor = createActor(testParentMachine);
    let step = 1;
    actor.subscribe((snapshot) => {
        if (step === 1 && snapshot.context.recognizedKeyHistory.length > 0) {
            const keyboardSnapshot = snapshot.children.keyboard!.getSnapshot();
            expect(keyboardSnapshot.context.pressedKeys.size).toBe(3);
            actor.send({ type: "KEY_UP", keyCapId: "MetaLeft" });
            step = 2;
        } else if (step === 2 && snapshot.children.keyboard!.getSnapshot().context.pressedKeys.size === 1) {
            const keyboardSnapshot = snapshot.children.keyboard!.getSnapshot();
            expect(keyboardSnapshot.context.pressedKeys.has("ShiftLeft")).toBe(true);
            expect(keyboardSnapshot.context.pressedKeys.has("KeyC")).toBe(false);
            expect(keyboardSnapshot.context.pressedKeys.has("MetaLeft")).toBe(false);
            resolve();
        }
    });

    actor.start();
    actor.send({ type: "KEY_DOWN", keyCapId: "MetaLeft" });
    actor.send({ type: "KEY_DOWN", keyCapId: "ShiftLeft" });
    actor.send({ type: "KEY_DOWN", keyCapId: "KeyC" });
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

  it("should handle multiple keys and release them correctly", () => new Promise<void>((resolve) => {
    const actor = createActor(testParentMachine);
    let step = 0;

    actor.subscribe((snapshot) => {
        if (step === 0 && snapshot.context.recognizedKeyHistory.length === 1 && snapshot.context.recognizedKeyHistory[0]?.includes("KeyA")) {
            expect(snapshot.children.keyboard!.getSnapshot().context.pressedKeys.size).toBe(2);
            expect(snapshot.context.recognizedKeyHistory[0]).toEqual(expect.arrayContaining(["ShiftLeft", "KeyA"]));
            actor.send({ type: "KEY_UP", keyCapId: "KeyA" });
            step = 1;
        } else if (step === 1 && snapshot.children.keyboard!.getSnapshot().context.pressedKeys.size === 1) {
            expect(snapshot.children.keyboard!.getSnapshot().context.pressedKeys.has("ShiftLeft")).toBe(true);
            actor.send({ type: "KEY_DOWN", keyCapId: "KeyB" });
            step = 2;
        } else if (step === 2 && snapshot.context.recognizedKeyHistory.length === 2 && snapshot.context.recognizedKeyHistory[1]?.includes("KeyB")) {
            expect(snapshot.children.keyboard!.getSnapshot().context.pressedKeys.size).toBe(2);
             expect(snapshot.context.recognizedKeyHistory[1]).toEqual(expect.arrayContaining(["ShiftLeft", "KeyB"]));
            actor.send({ type: "KEY_UP", keyCapId: "ShiftLeft" });
            step = 3;
        } else if (step === 3 && snapshot.children.keyboard!.getSnapshot().context.pressedKeys.size === 1) {
            expect(snapshot.children.keyboard!.getSnapshot().context.pressedKeys.has("KeyB")).toBe(true);
            actor.send({ type: "KEY_UP", keyCapId: "KeyB" });
            step = 4;
        } else if (step === 4 && snapshot.children.keyboard!.getSnapshot().matches("idle")) {
            expect(snapshot.children.keyboard!.getSnapshot().context.pressedKeys.size).toBe(0);
            resolve();
        }
    });
    
    actor.start();
    actor.send({ type: "KEY_DOWN", keyCapId: "ShiftLeft" });
    actor.send({ type: "KEY_DOWN", keyCapId: "KeyA" });
  }));
  
  it("should handle Meta key press and release correctly", () => new Promise<void>((resolve) => {
    const actor = createActor(testParentMachine);
    let step = 0;
    actor.subscribe((snapshot) => {
        if (step === 0 && snapshot.context.recognizedKeyHistory.length > 0) {
            const keyboardSnapshot = snapshot.children.keyboard!.getSnapshot();
            expect(keyboardSnapshot.context.pressedKeys.size).toBe(2);
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

  it("should handle functional keys correctly", () => new Promise<void>((resolve) => {
    const actor = createActor(testParentMachine);
    actor.subscribe((snapshot) => {
        const keyboardSnapshot = snapshot.children.keyboard?.getSnapshot();
        if (keyboardSnapshot?.context.pressedKeys.has("Escape")) {
            expect(keyboardSnapshot.value).toBe("listening");
            expect(snapshot.context.recognizedKeyHistory).toEqual([]); // Functional keys don't trigger recognition
            actor.send({ type: "KEY_UP", keyCapId: "Escape" });
        } else if(keyboardSnapshot?.matches("idle") && snapshot.context.recognizedKeyHistory.length === 0) {
            // Make sure we resolve only after key is up and no recognition happened
            if(!keyboardSnapshot.context.pressedKeys.has("Escape")) {
                resolve();
            }
        }
    });
    actor.start();
    actor.send({ type: "KEY_DOWN", keyCapId: "Escape" });
  }));

  it("should handle multiple modifier keys correctly", () => new Promise<void>((resolve) => {
    const actor = createActor(testParentMachine);
    let step = 0;
    actor.subscribe((snapshot) => {
        const keyboardSnapshot = snapshot.children.keyboard?.getSnapshot();
        if (step === 0 && keyboardSnapshot?.context.pressedKeys.size === 3) {
            expect(keyboardSnapshot.value).toBe("listening");
            expect(keyboardSnapshot.context.pressedKeys.has("ControlLeft")).toBe(true);
            expect(keyboardSnapshot.context.pressedKeys.has("ShiftLeft")).toBe(true);
            expect(keyboardSnapshot.context.pressedKeys.has("AltLeft")).toBe(true);
            expect(snapshot.context.recognizedKeyHistory).toEqual([]); // No recognition yet
            actor.send({ type: "KEY_DOWN", keyCapId: "KeyD" });
            step = 1;
        } else if (step === 1 && snapshot.context.recognizedKeyHistory.length > 0) {
            const keyboardSnapshot = snapshot.children.keyboard!.getSnapshot();
            expect(keyboardSnapshot.context.pressedKeys.size).toBe(4);
            expect(snapshot.context.recognizedKeyHistory[0]).toEqual(
                expect.arrayContaining(["ControlLeft", "ShiftLeft", "AltLeft", "KeyD"])
            );
            resolve();
        }
    });

    actor.start();
    actor.send({ type: "KEY_DOWN", keyCapId: "ControlLeft" });
    actor.send({ type: "KEY_DOWN", keyCapId: "ShiftLeft" });
    actor.send({ type: "KEY_DOWN", keyCapId: "AltLeft" });
  }));
});
