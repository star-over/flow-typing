/**
 * @file Инстанс TableAggregate над drillSelectionIndex (ADR 0009). Один на проект,
 * общий для писателя (convex/selectionIndex.ts — sync при пересборке) и читателя
 * (convex/drill.ts — count/at). Namespace = раскладка (отдельное дерево, нет
 * cross-layout контеншена), Key = stepLevel (диапазон «потолок репертуара»).
 */
import { TableAggregate } from '@convex-dev/aggregate';
import { components } from './_generated/api';
import type { DataModel } from './_generated/dataModel';

export const drillIndex = new TableAggregate<{
  Namespace: string;
  Key: number;
  DataModel: DataModel;
  TableName: 'drillSelectionIndex';
}>(components.drillIndex, {
  namespace: (row) => row.symbolLayoutId,
  sortKey: (row) => row.stepLevel,
});
