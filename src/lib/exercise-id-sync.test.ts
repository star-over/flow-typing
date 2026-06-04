import { describe, expect, it } from 'vitest';
import { planExerciseIdSync, type ExerciseIdSyncAction } from './exercise-id-sync';

describe('planExerciseIdSync', () => {
  it("returns NOOP when URL and store are both empty", () => {
    expect(
      planExerciseIdSync({
        urlId: null,
        storeId: null,
        currentSearch: '',
        hasSyncedFromUrl: false,
      })
    ).toEqual<ExerciseIdSyncAction>({ type: 'NOOP' });
  });

  it("returns NOOP when URL and store hold the same id", () => {
    expect(
      planExerciseIdSync({
        urlId: 'abc',
        storeId: 'abc',
        currentSearch: '?exerciseId=abc',
        hasSyncedFromUrl: true,
      })
    ).toEqual<ExerciseIdSyncAction>({ type: 'NOOP' });
  });

  it("pulls the URL value into the store on the first divergence", () => {
    expect(
      planExerciseIdSync({
        urlId: 'abc',
        storeId: null,
        currentSearch: '?exerciseId=abc',
        hasSyncedFromUrl: false,
      })
    ).toEqual<ExerciseIdSyncAction>({ type: 'URL_TO_STORE', exerciseId: 'abc' });
  });

  it("URL wins even when it is empty and the store has a value (initial pull)", () => {
    expect(
      planExerciseIdSync({
        urlId: null,
        storeId: 'stored',
        currentSearch: '',
        hasSyncedFromUrl: false,
      })
    ).toEqual<ExerciseIdSyncAction>({ type: 'URL_TO_STORE', exerciseId: undefined });
  });

  it("pushes a new store value into the URL after the initial sync", () => {
    expect(
      planExerciseIdSync({
        urlId: null,
        storeId: 'next',
        currentSearch: '',
        hasSyncedFromUrl: true,
      })
    ).toEqual<ExerciseIdSyncAction>({ type: 'STORE_TO_URL', newSearch: 'exerciseId=next' });
  });

  it("clears `exerciseId` from the URL when the store value is cleared", () => {
    expect(
      planExerciseIdSync({
        urlId: 'old',
        storeId: null,
        currentSearch: '?exerciseId=old',
        hasSyncedFromUrl: true,
      })
    ).toEqual<ExerciseIdSyncAction>({ type: 'STORE_TO_URL', newSearch: '' });
  });

  it("preserves unrelated query parameters when rewriting the URL", () => {
    expect(
      planExerciseIdSync({
        urlId: 'old',
        storeId: 'new',
        currentSearch: '?lang=ru&exerciseId=old&theme=dark',
        hasSyncedFromUrl: true,
      })
    ).toEqual<ExerciseIdSyncAction>({
      type: 'STORE_TO_URL',
      newSearch: 'lang=ru&exerciseId=new&theme=dark',
    });
  });

  it("adds `exerciseId` to an existing query string without disturbing it", () => {
    expect(
      planExerciseIdSync({
        urlId: null,
        storeId: 'fresh',
        currentSearch: '?lang=ru',
        hasSyncedFromUrl: true,
      })
    ).toEqual<ExerciseIdSyncAction>({
      type: 'STORE_TO_URL',
      newSearch: 'lang=ru&exerciseId=fresh',
    });
  });
});
