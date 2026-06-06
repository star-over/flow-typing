<script lang="ts">
  import '../app.css';
  import { preferences } from '@/lib/preferences';

  const { children } = $props();

  // Sync <html lang> with preferences (runs on mount + subscription)
  $effect(() => {
    const lang = $preferences.interfaceLanguage;
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
  });
</script>

{@render children()}
