<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import SurveyPrompt from './SurveyPrompt.svelte';
  import enDictionary from '../../../dictionaries/en.json';

  const { Story } = defineMeta({
    title: 'UI/SurveyPrompt',
    component: SurveyPrompt,
    argTypes: {
      dictionary: { table: { disable: true } },
      onAnswer: { table: { disable: true } },
    },
    args: {
      dictionary: enDictionary,
      onAnswer: () => {},
    },
  });
</script>

<Story name="Question" />

<Story name="Thanks" args={{ phase: 'thanks' }} />
