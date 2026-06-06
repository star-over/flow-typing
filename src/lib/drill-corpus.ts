import rawCorpus from '@/data/drills/drills.jsonl?raw';
import { DrillSchema } from '@/interfaces/drill-data.types';
import type { Drill } from '@/interfaces/drill-data.types';

function parseCorpus(raw: string): Drill[] {
  const lines = raw.split('\n').filter((l) => l.trim().length > 0);
  return lines.map((line, index) => {
    try {
      return DrillSchema.parse(JSON.parse(line));
    } catch (e) {
      throw new Error(`Invalid drill at line ${index + 1}: ${e}`);
    }
  });
}

/**
 * Корпус всех drill'ов, загруженный на старте модуля.
 * При нарушении схемы какой-либо записи модуль выбрасывает с точной строкой.
 */
export const DRILL_CORPUS: Drill[] = parseCorpus(rawCorpus);
