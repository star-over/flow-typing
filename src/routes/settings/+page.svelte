<script lang="ts">
  import { getContext } from 'svelte';
  import SettingsPage from '@/components/settings/SettingsPage.svelte';
  import { dictionary } from '@/lib/i18n';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { api, convex } from '@/lib/convex';
  import type { AuthStore } from '@/lib/auth/auth-store.svelte';

  const auth = getContext<AuthStore>('auth');

  // Оригинал от провайдера; null для гостя → поле имени в SettingsPage скрыто.
  const accountName = $derived(
    auth.state.status === 'authenticated'
      ? (auth.state.user.name ?? auth.state.user.email ?? '')
      : null,
  );

  // Удаление аккаунта (P0-4) — только авторизованному; гостю null → danger-зона
  // скрыта. Каскад стирает всё на сервере, затем чистим клиентскую сессию и уходим.
  const onDeleteAccount = $derived(
    auth.state.status === 'authenticated'
      ? async () => {
          await convex.mutation(api.account.deleteMyAccount, {});
          try {
            await auth.signOut();
          } catch {
            // Сессия уже удалена мутацией — серверный signOut может бросить;
            // локальный токен всё равно очищается, состояние станет guest.
          }
          await goto(resolve('/'));
        }
      : null,
  );
</script>

<SettingsPage
  dictionary={$dictionary}
  {accountName}
  {onDeleteAccount}
  onBack={() => goto(resolve('/'))}
/>
