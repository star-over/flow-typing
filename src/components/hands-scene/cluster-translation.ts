/**
 * Смещение (translation) контейнера кластера клавиш относительно центра
 * целевого пальца. Используется `HandsScene` для наведения кластера на палец.
 */

/** Центр прямоугольника — якоря совмещаются центрами, не углами. */
function centerOf(element: Element): { x: number; y: number } {
  const rect = element.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

/**
 * Вычисляет смещение (translation) для контейнера кластера клавиш.
 *
 * Совмещает ЦЕНТРЫ якорей. Углы совмещать нельзя: якоря разной природы и размера —
 * `.finger-center-point` это SVG-круг `r="2"` в координатах viewBox (на экране ~4.6px
 * после масштабирования руки), `.keycap-center-point` — блок ровно 2×2 CSS-px. По углам
 * центры разъезжаются на половину разницы размеров.
 *
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
  const finger = centerOf(fingerElement);
  const key = centerOf(keyElement);

  return { deltaX: finger.x - key.x, deltaY: finger.y - key.y };
}
