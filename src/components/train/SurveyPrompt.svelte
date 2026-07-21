<script lang="ts">
  import Button from '@/components/ui/Button.svelte';
  import type { Dictionary } from '@/interfaces/types';
  import type { SurveyAnswer } from '@/interfaces/survey';

  interface Props {
    dictionary: Dictionary;
    onAnswer: (answer: SurveyAnswer) => void;
    phase?: 'question' | 'thanks';
  }
  let { dictionary, onAnswer, phase = $bindable('question') }: Props = $props();

  function choose(answer: SurveyAnswer) {
    onAnswer(answer);
    phase = 'thanks';
  }
</script>

<section class="survey">
  {#if phase === 'question'}
    <div class="row">
      <p class="question">{dictionary.survey.question}</p>
      <button
        type="button"
        class="dismiss"
        aria-label={dictionary.survey.dismiss_label}
        onclick={() => choose('dismissed')}
      >
        ✕
      </button>
    </div>
    <div class="answers">
      <Button variant="neutral" style="--color-surface: var(--color-background);" type="button" onclick={() => choose('yes')}>{dictionary.survey.answer_yes}</Button>
      <Button variant="neutral" style="--color-surface: var(--color-background);" type="button" onclick={() => choose('no')}>{dictionary.survey.answer_no}</Button>
    </div>
  {:else}
    <p class="thanks">{dictionary.survey.thanks}</p>
  {/if}
</section>

<style>
  .survey {
    max-width: 28rem;
    padding: var(--spacing-4);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-4);
  }

  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-2);
  }

  .question {
    color: var(--color-text-primary);
  }

  .answers {
    display: flex;
    gap: var(--spacing-2);
    margin-top: var(--spacing-3);
  }

  .dismiss {
    color: var(--color-text-secondary);
    background: none;
    border: none;
    cursor: pointer;
  }

  .dismiss:focus-visible {
    outline: var(--focus-ring-width) solid var(--color-text-primary);
    outline-offset: var(--focus-ring-offset);
  }

  .thanks {
    color: var(--color-text-secondary);
  }
</style>
