// src/interfaces/user-preferences.ts

import type { SymbolLayoutId } from '@/interfaces/types';

/**
 * Определяет структуру пользовательских предпочтений приложения.
 * В MVP включает только базовые опции.
 */
export interface UserPreferences {
  /**
   * Язык интерфейса и упражнений.
   */
  language: 'en' | 'ru';
  /**
   * Идентификатор символьной раскладки, выбранной пользователем (qwerty / йцукен).
   * Определяет как визуальное отображение, так и логику упражнений.
   */
  symbolLayoutId: SymbolLayoutId;

  /**
   * Предпочтения, предназначенные для обмена через URL.
   * Позволяют делиться ссылками на конкретные упражнения или состояния.
   */
  shared: {
    exerciseId?: string;
  };
}
