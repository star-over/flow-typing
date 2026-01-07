/**
 * @file Pathfinding utilities for the keyboard layout.
 * @description Contains functions to represent the keyboard as a graph and find paths between keys.
 */

import { KeyboardLayout,KeyCapId } from "@/interfaces/types";

type AdjacencyList = Map<KeyCapId, KeyCapId[]>;

/**
 * Creates a graph representation (adjacency list) of the keyboard layout.
 * Each key is a node, and edges connect to immediate geometric neighbors.
 * @param keyboardLayout The 2D array representing the physical keyboard layout.
 * @returns An adjacency list (Map) representing the keyboard graph.
 */
export function createKeyboardGraph(keyboardLayout: KeyboardLayout): AdjacencyList {
  const graph: AdjacencyList = new Map();
  const rows = keyboardLayout.length;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < keyboardLayout[r].length; c++) {
      const key = keyboardLayout[r][c];
      if (!key) continue;

      const neighbors: KeyCapId[] = [];
      const { keyCapId } = key;

      // Directions: up, down, left, right
      const directions = [
        { dr: -1, dc: 0 }, // Up
        { dr: 1, dc: 0 },  // Down
        { dr: 0, dc: -1 }, // Left
        { dr: 0, dc: 1 },  // Right
      ];

      for (const dir of directions) {
        const nr = r + dir.dr;
        const nc = c + dir.dc;

        if (nr >= 0 && nr < rows && nc >= 0 && nc < keyboardLayout[nr]?.length) {
          const neighborKey = keyboardLayout[nr][nc];
          if (neighborKey) {
            neighbors.push(neighborKey.keyCapId);
          }
        }
      }
      graph.set(keyCapId, neighbors);
    }
  }
  return graph;
}

/**
 * Finds the shortest path between two keys on the keyboard graph using Breadth-First Search (BFS).
 * @param startKey The starting KeyCapId.
 * @param endKey The ending KeyCapId.
 * @param graph The adjacency list representation of the keyboard.
 * @returns An array of KeyCapIds representing the shortest path, or an empty array if no path is found.
 */
export function findOptimalPath(startKey: KeyCapId, endKey: KeyCapId, graph: AdjacencyList): KeyCapId[] {
  if (!graph.has(startKey) || !graph.has(endKey)) {
    return []; // Start or end key not in graph
  }

  if (startKey === endKey) {
    return [startKey];
  }

  const queue: KeyCapId[][] = [[startKey]];
  const visited = new Set<KeyCapId>([startKey]);

  while (queue.length > 0) {
    const path = queue.shift()!;
    const node = path[path.length - 1];

    if (node === endKey) {
      return path;
    }

    const neighbors = graph.get(node) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        const newPath = [...path, neighbor];
        queue.push(newPath);
      }
    }
  }

  return []; // No path found
}
