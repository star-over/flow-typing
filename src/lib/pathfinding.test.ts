import { describe, expect, it } from "vitest";

import { getPhysicalLayout } from "@/lib/layouts";

import { createKeyboardGraph, findOptimalPath } from "./pathfinding";

describe("pathfinding utilities", () => {
  const physicalLayoutANSI = getPhysicalLayout('ansi');
  const graph = createKeyboardGraph(physicalLayoutANSI);

  describe("createKeyboardGraph", () => {
    it("should create a graph with all keys from the layout", () => {
      const totalKeys = physicalLayoutANSI.length;
      expect(graph.size).toBe(totalKeys);
    });

    it("should correctly identify neighbors for a standard key", () => {
      const neighborsOfS = graph.get("KeyS");
      // Expect A, W, X, D to be neighbors
      expect(neighborsOfS).toContain("KeyA");
      expect(neighborsOfS).toContain("KeyW");
      expect(neighborsOfS).toContain("KeyX");
      expect(neighborsOfS).toContain("KeyD");
    });

    it("should handle keys at the edge of the keyboard", () => {
      const neighborsOfQ = graph.get("KeyQ");
      expect(neighborsOfQ).toContain("Tab");
      expect(neighborsOfQ).toContain("KeyW");
      expect(neighborsOfQ).toContain("KeyA");
      expect(neighborsOfQ).toContain("Digit1");
      expect(neighborsOfQ?.length).toBe(4);
    });
  });

  describe("findOptimalPath", () => {
    it("should find a direct path between two adjacent keys", () => {
      const path = findOptimalPath({ startKey: "KeyF", endKey: "KeyG", graph });
      expect(path).toEqual(["KeyF", "KeyG"]);
    });

    it("should find a valid shortest path involving vertical and horizontal movement", () => {
      // Path from J (home key) to Y
      const pathJY = findOptimalPath({ startKey: "KeyJ", endKey: "KeyY", graph });
      expect(pathJY.length).toBe(3);
      expect(pathJY[0]).toBe("KeyJ");
      expect(pathJY[2]).toBe("KeyY");

      // Path from J (home key) to U (adjacent)
      const pathJU = findOptimalPath({ startKey: "KeyJ", endKey: "KeyU", graph });
      expect(pathJU).toEqual(["KeyJ", "KeyU"]);
    });

    it("should return a path with only the start node if start and end are the same", () => {
      const path = findOptimalPath({ startKey: "KeyA", endKey: "KeyA", graph });
      expect(path).toEqual(["KeyA"]);
    });

    it("should return an empty array if no path is found", () => {
      // Create a disconnected graph for testing
      const disconnectedGraph = new Map();
      disconnectedGraph.set("KeyA", []);
      disconnectedGraph.set("KeyB", []);
      const path = findOptimalPath({ startKey: "KeyA", endKey: "KeyB", graph: disconnectedGraph });
      expect(path).toEqual([]);
    });

    it("should return an empty array if start or end key is not in the graph", () => {
      // @ts-expect-error Testing with a non-existent key
      const path1 = findOptimalPath({ startKey: "KeyA", endKey: "NonExistentKey", graph });
      expect(path1).toEqual([]);

      // @ts-expect-error Testing with a non-existent key
      const path2 = findOptimalPath({ startKey: "NonExistentKey", endKey: "KeyA", graph });
      expect(path2).toEqual([]);
    });
  });
});
