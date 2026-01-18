/**
 * @file Утилиты для позиционирования UI элементов.
 */

/**
 * Вычисляет смещение (translation) для контейнера кластера клавиш.
 *
 * @param fingerElement - DOM-элемент центральной точки пальца.
 * @param keyElement - DOM-элемент центральной точки "домашней" клавиши внутри кластера.
 * @param containerElement - DOM-элемент, относительно которого позиционируется кластер.
 * @returns Объект с `deltaX` и `deltaY` или `null`, если не удалось получить размеры контейнера.
 */
export function calculateClusterTranslation(
  fingerElement: Element,
  keyElement: Element,
  containerElement: Element
): { deltaX: number, deltaY: number } | null {
  const fingerRect = fingerElement.getBoundingClientRect();
  const keyRect = keyElement.getBoundingClientRect();
  const containerRect = containerElement.getBoundingClientRect();

  if (containerRect) {
    const deltaX = (fingerRect.left - containerRect.left) - (keyRect.left - containerRect.left);
    const deltaY = (fingerRect.top - containerRect.top) - (keyRect.top - containerRect.top);
    return { deltaX, deltaY };
  }

  return null;
}
