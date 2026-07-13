<script lang="ts">
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
      <button type="button" class="answer" onclick={() => choose('yes')}>{dictionary.survey.answer_yes}</button>
      <button type="button" class="answer" onclick={() => choose('somewhat')}>{dictionary.survey.answer_somewhat}</button>
      <button type="button" class="answer" onclick={() => choose('no')}>{dictionary.survey.answer_no}</button>
    </div>
  {:else}
    <p class="thanks">{dictionary.survey.thanks}</p>
  {/if}
</section>

<style>
  .survey {
    max-width: 28rem;
    padding: var(--spacing-4);
    background: var(--survey-prompt-background);
    border: var(--survey-prompt-border);
    border-radius: var(--radius-4);
  }

  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-2);
  }

  .question {
    color: var(--survey-prompt-question-color);
  }

  .answers {
    display: flex;
    gap: var(--spacing-2);
    margin-top: var(--spacing-3);
  }

  .answer {
    padding: var(--spacing-2) var(--spacing-4);
    background: var(--survey-prompt-button-background);
    border: var(--survey-prompt-button-border);
    border-radius: var(--radius-3);
    color: var(--survey-prompt-button-color);
    cursor: pointer;
  }

  .answer:hover {
    background: var(--survey-prompt-button-hover-background);
  }

  .dismiss {
    color: var(--survey-prompt-dismiss-color);
    background: none;
    border: none;
    cursor: pointer;
  }

  .thanks {
    color: var(--survey-prompt-thanks-color);
  }
</style>
