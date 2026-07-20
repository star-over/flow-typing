<script lang="ts">
  import { page } from '$app/state';
  import MessageScreen from '@/components/ui/MessageScreen.svelte';
  import { dictionary } from '@/lib/i18n';

  // Страница ошибки навигации SvelteKit (404, сбой перехода). Рендерится
  // внутри +layout — Header с логотипом/навигацией остаётся живым, поэтому здесь
  // достаточно объяснить и предложить перезагрузку. Все надписи — из словаря
  // (ADR 0022); статус-код — число, не переводимая строка.
</script>

<MessageScreen
  title={$dictionary.app.error_title}
  body={$dictionary.app.error_body}
  note={page.status ? String(page.status) : undefined}
  actionLabel={$dictionary.app.reload}
  onAction={() => location.reload()}
/>
