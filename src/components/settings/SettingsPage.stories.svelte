<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import SettingsPage from './SettingsPage.svelte';
  import enDictionary from '../../../dictionaries/en.json';

  const { Story } = defineMeta({
    title: 'UI/SettingsPage',
    component: SettingsPage,
    argTypes: {
      dictionary: { table: { disable: true } },
      onDeleteAccount: { table: { disable: true } },
    },
    args: {
      dictionary: enDictionary,
    },
  });
</script>

<!-- Гость: поле имени скрыто, danger-зона скрыта (onDeleteAccount = null). -->
<Story name="Guest" args={{ accountName: null, onDeleteAccount: null }} />

<!--
  Авторизован: поле имени + danger-зона. Клик «Delete account» раскрывает
  предупреждение + «Delete permanently» / «Cancel» (двухшаговое подтверждение).
-->
<Story name="Authenticated" args={{ accountName: 'Demo User', onDeleteAccount: async () => {} }} />

<!-- Сбой удаления: onDeleteAccount reject → после подтверждения показывается error-строка. -->
<Story
  name="DeletionFails"
  args={{
    accountName: 'Demo User',
    onDeleteAccount: async () => {
      throw new Error('demo failure');
    },
  }}
/>
