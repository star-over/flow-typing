import { derived } from 'svelte/store';
import { preferences } from './preferences';
import en from '../../dictionaries/en.json';
import ru from '../../dictionaries/ru.json';

const dictionaries = { en, ru } as const;

export const dictionary = derived(preferences, ($p) => dictionaries[$p.interfaceLanguage]);
