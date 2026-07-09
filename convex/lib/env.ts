/**
 * @file Определение окружения деплоя Convex для gating dev-инструментов (ADR 0012).
 *
 * У Convex нет встроенного признака «это production»: env-переменные задаются
 * per-deployment (docs.convex.dev/production/environment-variables), а набор
 * вызываемых функций фиксируется на деплое — выбирать тип функции по env нельзя.
 * Поэтому мы держим ЯВНЫЙ маркер `DEPLOY_ENV` на каждом деплое: `development`
 * на dev-deployment, не задан (или `production`) на боевом.
 *
 * **Fail-closed**: prod-предохранители снимает ТОЛЬКО явный `DEPLOY_ENV=development`.
 * Отсутствие или любое другое значение трактуется как production (закрыто). Так
 * забытая переменная на prod оставляет двери закрытыми, а забытая на dev ломает
 * dev-инструмент громко и безопасно. Защита не зависит от «вспомнить выставить
 * признак на боевом» — прямой мандат P0-3: не полагаться только на дисциплину env.
 */

/** true на любом деплое, кроме явно помеченного `DEPLOY_ENV=development`. */
export function isProduction(): boolean {
  return process.env.DEPLOY_ENV !== 'development';
}

/**
 * Бросает на production-деплое. Гейт для dev-инструментов (ADR 0012): dev-вход и
 * мутации «чистого листа» / прыжка по ступеням существуют только вне prod.
 */
export function assertNonProd(): void {
  if (isProduction()) {
    throw new Error('This function is disabled on production deployments.');
  }
}
