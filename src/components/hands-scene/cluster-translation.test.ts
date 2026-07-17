import { describe, expect, it } from 'vitest';
import { calculateClusterTranslation } from './cluster-translation';

/**
 * Мок DOM-элемента с `getBoundingClientRect`.
 *
 * Размеры задаются ОТДЕЛЬНО для пальца и клавиши намеренно: якоря разной природы —
 * `.finger-center-point` это SVG-круг `r="2"` в координатах viewBox (на экране ~4.6px),
 * `.keycap-center-point` — блок ровно 2×2 CSS-px. Прежние тесты давали обоим `width: 10`,
 * половина разницы обнулялась, и совмещение по углам проходило как верное.
 */
const mockElement = ({ left, top, size }: { left: number; top: number; size: number }) =>
  ({
    getBoundingClientRect: () => ({
      x: left, y: top, width: size, height: size,
      top, left, right: left + size, bottom: top + size,
      toJSON: () => '',
    }),
  }) as Element;

const container = mockElement({ left: 0, top: 0, size: 500 });

describe('calculateClusterTranslation', () => {
  it('совмещает ЦЕНТРЫ якорей, а не их углы', () => {
    // Центр пальца: 200 + 4.6/2 = 202.3 · центр клавиши: 50 + 2/2 = 51 → 151.3
    const finger = mockElement({ left: 200, top: 100, size: 4.6 });
    const key = mockElement({ left: 50, top: 50, size: 2 });

    const result = calculateClusterTranslation({ fingerElement: finger, keyElement: key, containerElement: container });

    expect(result).toEqual({ deltaX: 151.3, deltaY: 51.3 });
    // По углам вышло бы ровно 150/50 — на половину разницы размеров мимо центра пальца.
  });

  it('якоря одного размера — центры и углы совпадают', () => {
    const finger = mockElement({ left: 250, top: 150, size: 2 });
    const key = mockElement({ left: 100, top: 100, size: 2 });

    const result = calculateClusterTranslation({ fingerElement: finger, keyElement: key, containerElement: container });

    expect(result).toEqual({ deltaX: 150, deltaY: 50 });
  });

  it('не зависит от положения контейнера', () => {
    const finger = mockElement({ left: 250, top: 150, size: 4.6 });
    const key = mockElement({ left: 100, top: 100, size: 2 });
    const shifted = mockElement({ left: 50, top: 50, size: 500 });

    const atOrigin = calculateClusterTranslation({ fingerElement: finger, keyElement: key, containerElement: container });
    const atShifted = calculateClusterTranslation({ fingerElement: finger, keyElement: key, containerElement: shifted });

    expect(atShifted).toEqual(atOrigin);
  });

  it('без контейнера смещения нет', () => {
    const finger = mockElement({ left: 200, top: 100, size: 4.6 });
    const key = mockElement({ left: 50, top: 50, size: 2 });

    expect(calculateClusterTranslation({ fingerElement: finger, keyElement: key, containerElement: null })).toBeNull();
  });
});
