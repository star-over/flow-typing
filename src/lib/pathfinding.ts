/**
 * @file Pathfinding utilities for the keyboard layout.
 * @description Contains functions to represent the keyboard as a graph and find paths between keys.
 */

import type { PhysicalLayout,KeyCapId } from "@/interfaces/types";

export type AdjacencyList = Map<KeyCapId, KeyCapId[]>;

/**
 * Creates a graph representation (adjacency list) of the keyboard layout.
 * Each key is a node, and edges connect to immediate geometric neighbors.
 * @param physicalLayout The 2D array representing the physical keyboard layout.
 * @returns An adjacency list (Map) representing the keyboard graph.
 */
export function createKeyboardGraph(physicalLayout: PhysicalLayout): AdjacencyList {
  const graph: AdjacencyList = new Map();
  const rows = physicalLayout.length;

  for (let r = 0; r < rows; r++) {
    const row = physicalLayout[r];
    if (!row) continue;
    for (let c = 0; c < row.length; c++) {
      const key = row[c];
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

        const neighborRow = physicalLayout[nr];
        if (nr >= 0 && nr < rows && nc >= 0 && neighborRow && nc < neighborRow.length) {
          const neighborKey = neighborRow[nc];
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
 * @returns An array of KeyCapIds representing the shortest path, or an empty array if no path is found.
 */
export function findOptimalPath({
  startKey,
  endKey,
  graph,
}: {
  startKey: KeyCapId;
  endKey: KeyCapId;
  graph: AdjacencyList;
}): KeyCapId[] {
  if (!graph.has(startKey) || !graph.has(endKey)) {
    return []; // Start or end key not in graph
  }

  if (startKey === endKey) {
    return [startKey];
  }

  const queue: KeyCapId[][] = [[startKey]];
  const visited = new Set<KeyCapId>([startKey]);

  while (queue.length > 0) {
    const path = queue.shift();
    if (!path) continue;
    const node = path[path.length - 1];
    if (!node) continue;

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
