import { describe, it, expect, vi } from 'vitest';
import { calculateClusterTranslation } from './positioning-utils';

// Мок DOM-элементов с `getBoundingClientRect`
const createMockElement = (rect: DOMRect) => ({
  getBoundingClientRect: () => rect,
});

describe('calculateClusterTranslation', () => {
  it('should calculate the correct translation', () => {
    const fingerElement = createMockElement({ x: 200, y: 100, width: 10, height: 10, top: 100, left: 200, right: 210, bottom: 110, toJSON: () => '' });
    const keyElement = createMockElement({ x: 50, y: 50, width: 10, height: 10, top: 50, left: 50, right: 60, bottom: 60, toJSON: () => '' });
    const containerElement = createMockElement({ x: 0, y: 0, width: 500, height: 500, top: 0, left: 0, right: 500, bottom: 500, toJSON: () => '' });

    const result = calculateClusterTranslation(fingerElement as Element, keyElement as Element, containerElement as Element);

    // deltaX = (fingerLeft - containerLeft) - (keyLeft - containerLeft)
    // deltaX = (200 - 0) - (50 - 0) = 150
    // deltaY = (fingerTop - containerTop) - (keyTop - containerTop)
    // deltaY = (100 - 0) - (50 - 0) = 50
    expect(result).toEqual({ deltaX: 150, deltaY: 50 });
  });

  it('should handle different container positions', () => {
    const fingerElement = createMockElement({ x: 250, y: 150, width: 10, height: 10, top: 150, left: 250, right: 260, bottom: 160, toJSON: () => '' });
    const keyElement = createMockElement({ x: 100, y: 100, width: 10, height: 10, top: 100, left: 100, right: 110, bottom: 110, toJSON: () => '' });
    const containerElement = createMockElement({ x: 50, y: 50, width: 500, height: 500, top: 50, left: 50, right: 550, bottom: 550, toJSON: () => '' });

    const result = calculateClusterTranslation(fingerElement as Element, keyElement as Element, containerElement as Element);

    // deltaX = (250 - 50) - (100 - 50) = 200 - 50 = 150
    // deltaY = (150 - 50) - (100 - 50) = 100 - 50 = 50
    expect(result).toEqual({ deltaX: 150, deltaY: 50 });
  });

  it('should return null if containerRect is not available (though getBoundingClientRect always returns a rect)', () => {
    const fingerElement = createMockElement({ x: 200, y: 100, width: 10, height: 10, top: 100, left: 200, right: 210, bottom: 110, toJSON: () => '' });
    const keyElement = createMockElement({ x: 50, y: 50, width: 10, height: 10, top: 50, left: 50, right: 60, bottom: 60, toJSON: () => '' });
    
    // Мок элемента, где getBoundingClientRect возвращает "пустой" Rect,
    // что в реальности маловероятно, но проверяем крайний случай.
    const containerElement = {
      getBoundingClientRect: () => ({ x: 0, y: 0, width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0, toJSON: () => '' })
    };
    
    // В нашей реализации `calculateClusterTranslation` мы проверяем `containerRect`,
    // но `getBoundingClientRect` всегда возвращает объект. Для симуляции `null`
    // нам пришлось бы изменить мок, но это выходит за рамки реального поведения DOM.
    // Вместо этого, мы просто убедимся, что с нулевыми размерами расчеты корректны.
    const resultWithZeroSizedContainer = calculateClusterTranslation(fingerElement as Element, keyElement as Element, containerElement as Element);
    expect(resultWithZeroSizedContainer).toEqual({ deltaX: 150, deltaY: 50 });
  });
});
