import { createActor } from 'xstate';
import { appMachine } from './app.machine';

// Singleton actor at module scope: created once when the module loads.
// Under Vite HMR an edit to this file (or app.machine) re-evaluates the
// module, which would spawn a second actor on top of the first ("double
// actor" bug, visible as duplicated events). invalidate() opts this
// module out of HMR — Vite does a full page reload instead. Training
// state is lost on each reload (by design, no snapshot restore yet).
const actor = createActor(appMachine);
actor.start();
export const appActor = actor;

// Dev-only: перехват завершённых drill'ов в локальный набор данных печати
// (офлайн-анализ «чисел» + golden-fixtures для будущей summarize). Динамический
// импорт под условием DEV → отдельный chunk, в прод-сборку не входит. Проверка
// window — против SSR в dev. appActor — forever-singleton, отписка не нужна.
if (import.meta.env.DEV && typeof window !== 'undefined') {
  void import('@/lib/dev/typing-capture').then(({ attachTypingCapture }) => {
    attachTypingCapture(appActor);
  });
  // Dev-only: window.__resetProfile() — сброс профиля текущего юзера для проверки
  // алгоритма роста с чистого листа (см. lib/dev/profile-reset).
  void import('@/lib/dev/profile-reset').then(({ attachProfileReset }) => {
    attachProfileReset();
  });
  // Dev-only: window.__setLadderStep(step) — установить ступень KeyLadder текущего
  // юзера для текущей раскладки (см. lib/dev/ladder-set).
  void import('@/lib/dev/ladder-set').then(({ attachLadderStepSet }) => {
    attachLadderStepSet();
  });
}

if (import.meta.hot) {
  import.meta.hot.invalidate('appActor is a module-scope singleton — full reload required');
}
