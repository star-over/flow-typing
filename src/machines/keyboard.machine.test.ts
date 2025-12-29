import { describe, it, expect, vi } from "vitest";
import { createActor } from "xstate";
import { keyboardMachine } from "./keyboard.machine";
import { KeyCapId } from "@/interfaces/key-cap-id";

describe("keyboardMachine", () => {
  it("should start in idle state with no pressed keys", () => {
    const onRecognize = vi.fn();
    const actor = createActor(keyboardMachine, { input: { onRecognize } });
    actor.start();
    expect(actor.getSnapshot().value).toBe("idle");
    expect(actor.getSnapshot().context.pressedKeys.size).toBe(0);
  });

  it("should move to listening when a modifier key is pressed", () => {
    const onRecognize = vi.fn();
    const actor = createActor(keyboardMachine, { input: { onRecognize } });
    actor.start();
    actor.send({ type: "KEY_DOWN", keyCapId: "ShiftLeft" });

    const snapshot = actor.getSnapshot();
    expect(snapshot.value).toBe("listening");
    expect(snapshot.context.pressedKeys.has("ShiftLeft")).toBe(true);
    expect(onRecognize).not.toHaveBeenCalled();
  });

  it("should return to idle when the last key is released", () => {
    const onRecognize = vi.fn();
    const actor = createActor(keyboardMachine, { input: { onRecognize } });
    actor.start();
    actor.send({ type: "KEY_DOWN", keyCapId: "ShiftLeft" });
    actor.send({ type: "KEY_UP", keyCapId: "ShiftLeft" });

    const snapshot = actor.getSnapshot();
    expect(snapshot.value).toBe("idle");
    expect(snapshot.context.pressedKeys.size).toBe(0);
  });

  it("should trigger onRecognize when a text key is pressed", () => {
    const onRecognize = vi.fn();
    const actor = createActor(keyboardMachine, { input: { onRecognize } });
    actor.start();
    actor.send({ type: "KEY_DOWN", keyCapId: "KeyA" });

    const snapshot = actor.getSnapshot();
    expect(snapshot.value).toBe("listening"); // It goes to recognized then immediately to listening
    expect(snapshot.context.pressedKeys.has("KeyA")).toBe(true);
    expect(onRecognize).toHaveBeenCalledTimes(1);
    expect(onRecognize).toHaveBeenCalledWith(["KeyA"]);
  });

  it("should recognize a chord (modifier + key)", () => {
    const onRecognize = vi.fn();
    const actor = createActor(keyboardMachine, { input: { onRecognize } });
    actor.start();
    actor.send({ type: "KEY_DOWN", keyCapId: "ShiftLeft" });
    actor.send({ type: "KEY_DOWN", keyCapId: "KeyB" });

    const snapshot = actor.getSnapshot();
    expect(snapshot.value).toBe("listening");
    expect(snapshot.context.pressedKeys.size).toBe(2);
    expect(snapshot.context.pressedKeys.has("ShiftLeft")).toBe(true);
    expect(snapshot.context.pressedKeys.has("KeyB")).toBe(true);
    expect(onRecognize).toHaveBeenCalledTimes(1);
    expect(onRecognize).toHaveBeenCalledWith(expect.arrayContaining(["ShiftLeft", "KeyB"]));
  });

  it("should clear non-modifier keys when Meta is released", () => {
    const onRecognize = vi.fn();
    const actor = createActor(keyboardMachine, { input: { onRecognize } });
    actor.start();

    // Press Meta, then Shift, then a letter
    actor.send({ type: "KEY_DOWN", keyCapId: "MetaLeft" });
    actor.send({ type: "KEY_DOWN", keyCapId: "ShiftLeft" });
    actor.send({ type: "KEY_DOWN", keyCapId: "KeyC" });

    let snapshot = actor.getSnapshot();
    expect(snapshot.context.pressedKeys.size).toBe(3);
    expect(onRecognize).toHaveBeenCalledTimes(1);

    // Release Meta
    actor.send({ type: "KEY_UP", keyCapId: "MetaLeft" });

    snapshot = actor.getSnapshot();
    // Only ShiftLeft should remain
    expect(snapshot.context.pressedKeys.size).toBe(1);
    expect(snapshot.context.pressedKeys.has("ShiftLeft")).toBe(true);
    expect(snapshot.context.pressedKeys.has("KeyC")).toBe(false);
    expect(snapshot.context.pressedKeys.has("MetaLeft")).toBe(false);
  });

  it("should reset to idle state on RESET event", () => {
    const onRecognize = vi.fn();
    const actor = createActor(keyboardMachine, { input: { onRecognize } });
    actor.start();
    actor.send({ type: "KEY_DOWN", keyCapId: "ControlLeft" });
    actor.send({ type: "KEY_DOWN", keyCapId: "KeyD" });

    expect(actor.getSnapshot().value).not.toBe("idle");

    actor.send({ type: "RESET" });

    const snapshot = actor.getSnapshot();
    expect(snapshot.value).toBe("idle");
    expect(snapshot.context.pressedKeys.size).toBe(0);
  });

  it("should handle multiple keys and release them correctly", () => {
    const onRecognize = vi.fn();
    const actor = createActor(keyboardMachine, { input: { onRecognize } });
    actor.start();

    actor.send({ type: "KEY_DOWN", keyCapId: "ShiftLeft" });
    actor.send({ type: "KEY_DOWN", keyCapId: "KeyA" }); // onRecognize called

    let snapshot = actor.getSnapshot();
    expect(snapshot.context.pressedKeys.size).toBe(2);
    expect(onRecognize).toHaveBeenCalledTimes(1);
    expect(onRecognize).toHaveBeenCalledWith(expect.arrayContaining(["ShiftLeft", "KeyA"]));

    actor.send({ type: "KEY_UP", keyCapId: "KeyA" });
    snapshot = actor.getSnapshot();
    expect(snapshot.context.pressedKeys.size).toBe(1);
    expect(snapshot.context.pressedKeys.has("ShiftLeft")).toBe(true);

    actor.send({ type: "KEY_DOWN", keyCapId: "KeyB" }); // onRecognize called again
    snapshot = actor.getSnapshot();
    expect(snapshot.context.pressedKeys.size).toBe(2);
    expect(onRecognize).toHaveBeenCalledTimes(2);
    expect(onRecognize).toHaveBeenCalledWith(expect.arrayContaining(["ShiftLeft", "KeyB"]));

    actor.send({ type: "KEY_UP", keyCapId: "ShiftLeft" });
    snapshot = actor.getSnapshot();
    expect(snapshot.context.pressedKeys.size).toBe(1);
    expect(snapshot.context.pressedKeys.has("KeyB")).toBe(true);

    actor.send({ type: "KEY_UP", keyCapId: "KeyB" });
    snapshot = actor.getSnapshot();
    expect(snapshot.value).toBe("idle");
    expect(snapshot.context.pressedKeys.size).toBe(0);
  });
  it("should handle Meta key press and release correctly", () => {
    const onRecognize = vi.fn();
    const actor = createActor(keyboardMachine, { input: { onRecognize } });
    actor.start();

    // Press Meta key
    actor.send({ type: "KEY_DOWN", keyCapId: "MetaLeft" });
    let snapshot = actor.getSnapshot();
    expect(snapshot.value).toBe("listening");
    expect(snapshot.context.pressedKeys.has("MetaLeft")).toBe(true);

    // Press another key while Meta is held
    actor.send({ type: "KEY_DOWN", keyCapId: "KeyA" });
    snapshot = actor.getSnapshot();
    expect(snapshot.context.pressedKeys.size).toBe(2);
    expect(snapshot.context.pressedKeys.has("MetaLeft")).toBe(true);
    expect(snapshot.context.pressedKeys.has("KeyA")).toBe(true);
    expect(onRecognize).toHaveBeenCalledTimes(1);

    // Release Meta key - should clear non-modifier keys
    actor.send({ type: "KEY_UP", keyCapId: "MetaLeft" });
    snapshot = actor.getSnapshot();
    expect(snapshot.context.pressedKeys.size).toBe(0);
    expect(snapshot.context.pressedKeys.has("MetaLeft")).toBe(false);
    expect(snapshot.context.pressedKeys.has("KeyA")).toBe(false);
  });

  it("should handle functional keys correctly", () => {
    const onRecognize = vi.fn();
    const actor = createActor(keyboardMachine, { input: { onRecognize } });
    actor.start();

    // Press functional key (Escape)
    actor.send({ type: "KEY_DOWN", keyCapId: "Escape" });
    let snapshot = actor.getSnapshot();
    expect(snapshot.value).toBe("listening");
    expect(snapshot.context.pressedKeys.has("Escape")).toBe(true);
    expect(onRecognize).not.toHaveBeenCalled(); // Functional keys don't trigger onRecognize

    // Release functional key
    actor.send({ type: "KEY_UP", keyCapId: "Escape" });
    snapshot = actor.getSnapshot();
    expect(snapshot.value).toBe("idle");
    expect(snapshot.context.pressedKeys.size).toBe(0);
  });

  it("should handle multiple modifier keys correctly", () => {
    const onRecognize = vi.fn();
    const actor = createActor(keyboardMachine, { input: { onRecognize } });
    actor.start();

    // Press multiple modifiers
    actor.send({ type: "KEY_DOWN", keyCapId: "ControlLeft" });
    actor.send({ type: "KEY_DOWN", keyCapId: "ShiftLeft" });
    actor.send({ type: "KEY_DOWN", keyCapId: "AltLeft" });

    let snapshot = actor.getSnapshot();
    expect(snapshot.value).toBe("listening");
    expect(snapshot.context.pressedKeys.size).toBe(3);
    expect(snapshot.context.pressedKeys.has("ControlLeft")).toBe(true);
    expect(snapshot.context.pressedKeys.has("ShiftLeft")).toBe(true);
    expect(snapshot.context.pressedKeys.has("AltLeft")).toBe(true);
    expect(onRecognize).not.toHaveBeenCalled();

    // Press a text key with multiple modifiers
    actor.send({ type: "KEY_DOWN", keyCapId: "KeyD" });
    snapshot = actor.getSnapshot();
    expect(snapshot.context.pressedKeys.size).toBe(4);
    expect(onRecognize).toHaveBeenCalledTimes(1);
    expect(onRecognize).toHaveBeenCalledWith(
      expect.arrayContaining(["ControlLeft", "ShiftLeft", "AltLeft", "KeyD"])
    );
  });
});
