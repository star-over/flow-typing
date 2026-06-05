/**
 * @file Утилиты для позиционирования UI элементов.
 */

/**
 * Вычисляет смещение (translation) для контейнера кластера клавиш.
 * @returns `{ deltaX, deltaY }` или `null`, если контейнера нет.
 */
export function calculateClusterTranslation({
  fingerElement,
  keyElement,
  containerElement,
}: {
  fingerElement: Element;
  keyElement: Element;
  containerElement: Element | null;
}): { deltaX: number, deltaY: number } | null {
  if (!containerElement) return null;
  const fingerRect = fingerElement.getBoundingClientRect();
  const keyRect = keyElement.getBoundingClientRect();
  const containerRect = containerElement.getBoundingClientRect();

  const deltaX = (fingerRect.left - containerRect.left) - (keyRect.left - containerRect.left);
  const deltaY = (fingerRect.top - containerRect.top) - (keyRect.top - containerRect.top);
  return { deltaX, deltaY };
}
