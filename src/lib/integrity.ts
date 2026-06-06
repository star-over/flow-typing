import { z } from 'zod';
import { SymbolLayoutRegistrySchema } from '@/interfaces/types';
import { DrillSchema } from '@/interfaces/drill-data.types';
import { SYMBOL_LAYOUT_REGISTRY } from '@/lib/layouts';
import { DRILL_CORPUS } from '@/lib/drill-corpus';
import { filterDrillsBySymbolLayout } from '@/lib/drill-selection';

/**
 * Cross-collection инвариант: для каждой раскладки в реестре в корпусе должен
 * быть хотя бы один совместимый drill. Без этой проверки `startNewTrainingStream`
 * мог бы выбросить в рантайме «no drills for layout=X» — ловим раньше, при загрузке.
 */
const ApplicationDataSchema = z
  .object({
    registry: SymbolLayoutRegistrySchema,
    corpus: z.array(DrillSchema),
  })
  .superRefine(({ registry, corpus }, ctx) => {
    for (const d of registry) {
      const compatible = filterDrillsBySymbolLayout({
        allDrills: corpus,
        symbolLayoutDescriptor: d,
      });
      if (compatible.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `No drills in corpus for layout '${d.symbolLayoutId}'`,
        });
      }
    }
  });

// Side-effect: упадёт на загрузке модуля при нарушении.
ApplicationDataSchema.parse({
  registry: SYMBOL_LAYOUT_REGISTRY,
  corpus: DRILL_CORPUS,
});
