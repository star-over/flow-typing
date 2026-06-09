<script lang="ts">
  import '../app.css';
  import { settings } from '@/lib/settings';

  const { children } = $props();

  // Sync <html lang> with settings (runs on mount + subscription)
  $effect(() => {
    const lang = $settings.interfaceLanguage;
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
  });
</script>

{@render children()}
