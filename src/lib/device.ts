/**
 * Тач-первичное устройство без наведения (телефон/планшет без мыши) — прокси
 * «нет физической клавиатуры». Прямого обнаружения клавиатуры в вебе нет; это
 * нестрогая эвристика: `pointer: coarse` = основной указатель грубый (палец),
 * `hover: none` = наведение недоступно. Планшет с подключённой клавиатурой даёт
 * ложный позитив — гасится тем, что предупреждение мягкое, с «Продолжить всё
 * равно» (тренажёр десктопный by nature; см. docs/plans/2026-07-05-mvp-launch.md).
 */
export const TOUCH_ONLY_QUERY = '(pointer: coarse) and (hover: none)';

/**
 * `true`, если текущее устройство тач-первичное и без наведения. В окружениях
 * без `matchMedia` (node/SSR-заглушка) — `false` (по умолчанию считаем, что клавиатура есть).
 */
export function isTouchOnlyDevice(): boolean {
  if (typeof matchMedia !== 'function') return false;
  return matchMedia(TOUCH_ONLY_QUERY).matches;
}
