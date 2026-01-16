import 'server-only';
import { Dictionary, Locale } from '@/interfaces/types';

const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  en: () => import('../../dictionaries/en.json').then((module) => module.default),
  ru: () => import('../../dictionaries/ru.json').then((module) => module.default),
};

export const getDictionary = async (locale: Locale): Promise<Dictionary> => {
  const dictionaryLoader = dictionaries[locale] ?? dictionaries.en;
  return dictionaryLoader();
};
