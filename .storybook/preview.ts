import type { Decorator, Preview } from '@storybook/sveltekit';
import { THEMES } from '@/themes/registry';
import '../src/app.css';

/**
 * Тема как глобальный Storybook toolbar control. ID тем — raw, без i18n:
 * Storybook это инструмент разработчика, не пользователя; дублировать
 * dictionaries излишне.
 */
// eslint-disable-next-line no-restricted-syntax -- Storybook Decorator signature
const themeDecorator: Decorator = (story, ctx) => {
  const setting = ctx.globals.theme as string | undefined;
  const resolved =
    !setting || setting === 'auto'
      ? matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : setting;
  document.documentElement.dataset.theme = resolved;
  return story();
};

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  globalTypes: {
    theme: {
      name: 'Theme',
      toolbar: {
        icon: 'paintbrush',
        items: [
          { value: 'auto', title: 'Auto (system)' },
          ...THEMES.map((t) => ({ value: t.id, title: t.id })),
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: 'auto' },
  decorators: [themeDecorator],
};

export default preview;
