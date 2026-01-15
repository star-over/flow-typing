import 'server-only';

type Dictionary = {
  title: string;
};

const dictionaries: Record<string, () => Promise<Dictionary>> = {
  en: () => import('../../dictionaries/en.json').then((module) => module.default),
  ru: () => import('../../dictionaries/ru.json').then((module) => module.default),
};

export const getDictionary = async (locale: string): Promise<Dictionary> => {
  const dictionaryLoader = dictionaries[locale] || dictionaries.en;
  return dictionaryLoader();
};
