/**
 * Pure planner for the bidirectional `?exerciseId=` ↔ preferences-store sync.
 *
 * Rules:
 *  - On the very first divergence between URL and store, the URL wins
 *    (initial load / external navigation pulls into the store).
 *  - After that initial pull, the store wins (any further change inside the
 *    app pushes back out to the URL via replaceState).
 *
 * The function makes no side-effects and does not own `hasSyncedFromUrl` —
 * that flag lives on the caller and is set to true when the planner returns
 * a `URL_TO_STORE` action.
 */
export type ExerciseIdSyncAction =
  | { type: 'URL_TO_STORE'; exerciseId: string | undefined }
  | { type: 'STORE_TO_URL'; newSearch: string }
  | { type: 'NOOP' };

export function planExerciseIdSync(params: {
  urlId: string | null;
  storeId: string | null;
  currentSearch: string;
  hasSyncedFromUrl: boolean;
}): ExerciseIdSyncAction {
  const { urlId, storeId, currentSearch, hasSyncedFromUrl } = params;

  if (urlId === storeId) return { type: 'NOOP' };

  if (!hasSyncedFromUrl) {
    return { type: 'URL_TO_STORE', exerciseId: urlId ?? undefined };
  }

  const newParams = new URLSearchParams(currentSearch);
  if (storeId) {
    newParams.set('exerciseId', storeId);
  } else {
    newParams.delete('exerciseId');
  }

  const newQuery = newParams.toString();
  const currentQuery = currentSearch.replace(/^\?/, '');

  if (newQuery === currentQuery) return { type: 'NOOP' };
  return { type: 'STORE_TO_URL', newSearch: newQuery };
}
