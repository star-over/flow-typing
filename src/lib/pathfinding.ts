/**
 * @file Pathfinding utilities for the keyboard layout.
 * @description Contains functions to represent the keyboard as a graph and find paths between keys.
 */

import type { PhysicalLayout, PhysicalKey, KeyCapId } from "@/interfaces/types";

export type AdjacencyList = Map<KeyCapId, KeyCapId[]>;

/** Длина пересечения проекций двух клавиш на ось X (в U). */
function overlapX(a: PhysicalKey, b: PhysicalKey): number {
  return Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
}

/**
 * Создаёт граф соседства клавиш по их физическим координатам `(x, y, w)`.
 * Для каждой клавиши находим максимум четырёх соседей: ближайших сверху, снизу,
 * слева и справа. Сосед сверху/снизу выбирается по максимальному `overlapX`,
 * сосед слева/справа — по геометрической близости в том же ряду.
 */
export function createKeyboardGraph(physicalLayout: PhysicalLayout): AdjacencyList {
  const graph: AdjacencyList = new Map();

  for (const key of physicalLayout) {
    const neighbors: KeyCapId[] = [];

    // Сосед сверху: y' = y - 1 с максимальным horizontal overlap
    const above = pickByMaxOverlap(physicalLayout, key, key.y - 1);
    if (above) neighbors.push(above.keyCapId);

    // Сосед снизу: y' = y + 1 с максимальным horizontal overlap
    const below = pickByMaxOverlap(physicalLayout, key, key.y + 1);
    if (below) neighbors.push(below.keyCapId);

    // Сосед слева: y' = y, ближайший по правому краю (x' + w' <= x)
    const left = pickClosestSameRow(physicalLayout, key, 'left');
    if (left) neighbors.push(left.keyCapId);

    // Сосед справа: y' = y, ближайший по левому краю (x' >= x + w)
    const right = pickClosestSameRow(physicalLayout, key, 'right');
    if (right) neighbors.push(right.keyCapId);

    graph.set(key.keyCapId, neighbors);
  }

  return graph;
}

function pickByMaxOverlap(
  layout: PhysicalLayout,
  key: PhysicalKey,
  targetY: number
): PhysicalKey | undefined {
  let best: PhysicalKey | undefined;
  let bestOverlap = 0;
  for (const other of layout) {
    if (other.y !== targetY) continue;
    const ov = overlapX(key, other);
    if (ov > bestOverlap) {
      bestOverlap = ov;
      best = other;
    }
  }
  return best;
}

function pickClosestSameRow(
  layout: PhysicalLayout,
  key: PhysicalKey,
  direction: 'left' | 'right'
): PhysicalKey | undefined {
  let best: PhysicalKey | undefined;
  let bestDist = Infinity;
  for (const other of layout) {
    if (other.y !== key.y || other.keyCapId === key.keyCapId) continue;
    if (direction === 'left') {
      const rightEdge = other.x + other.w;
      if (rightEdge > key.x) continue;
      const dist = key.x - rightEdge;
      if (dist < bestDist) {
        bestDist = dist;
        best = other;
      }
    } else {
      const leftEdge = other.x;
      if (leftEdge < key.x + key.w) continue;
      const dist = leftEdge - (key.x + key.w);
      if (dist < bestDist) {
        bestDist = dist;
        best = other;
      }
    }
  }
  return best;
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
