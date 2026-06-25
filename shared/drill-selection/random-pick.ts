/**
 * @file Чистые помощники равномерного случайного отбора (ADR 0009, storage-слой).
 * Детерминированы по seed → воспроизводимая выборка (реплей/тесты). I/O нет —
 * adapter (convex/drill.ts) дёргает at()/db.get() по полученным offset'ам.
 */

/** Детерминированный PRNG (mulberry32): seed → поток float ∈ [0, 1). */
export function makeSeededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Следующий уникальный offset ∈ [0, count) через rejection по `used` (мутируется).
 * null, когда пул исчерпан (used покрывает весь диапазон). При k ≪ count коллизии
 * редки → O(1) амортизированно; на исчерпании выходим сразу, без зацикливания.
 */
export function nextDistinctOffset({
  rng,
  count,
  used,
}: {
  rng: () => number;
  count: number;
  used: Set<number>;
}): number | null {
  if (used.size >= count) return null;
  for (;;) {
    const offset = Math.floor(rng() * count);
    if (!used.has(offset)) {
      used.add(offset);
      return offset;
    }
  }
}
