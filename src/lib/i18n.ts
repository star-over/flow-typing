import { settings } from './settings';
import { derived } from 'svelte/store';
import en from '../../dictionaries/en.json';
import ru from '../../dictionaries/ru.json';

const dictionaries = { en, ru } as const;

export const dictionary = derived(settings, ($s) => dictionaries[$s.interfaceLanguage]);
