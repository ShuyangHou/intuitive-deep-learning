import { useRef, type ReactNode } from 'react';
import { currentModuleId, Feedback } from '../../shared/react';
import { usePersistedActivity } from './usePersistedActivity';

export interface PersistedPanelChoiceOption {
  id: string;
  key?: ReactNode;
  title: ReactNode;
  caption?: ReactNode;
  media: ReactNode;
}

export interface PersistedPanelChoiceState {
  version: 1;
  selectedId: string | null;
  correct: boolean;
  locked: boolean;
}

export interface PersistedPanelChoiceProps {
  persistenceKey: string;
  title: ReactNode;
  options: PersistedPanelChoiceOption[];
  correctId: string;
  typeLabel?: ReactNode;
  feedback?: {
    initial?: ReactNode;
    correct?: ReactNode;
    wrong?: ReactNode;
  };
  onComplete?: () => void;
  moduleId?: string;
  className?: string;
}

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

function initialPanelState(): PersistedPanelChoiceState {
  return {
    version: 1,
    selectedId: null,
    correct: false,
    locked: false,
  };
}

function normalizePanelState(stored: unknown): PersistedPanelChoiceState | null {
  if (!stored || typeof stored !== 'object') return null;
  const value = stored as Partial<PersistedPanelChoiceState>;
  if (value.selectedId !== null && typeof value.selectedId !== 'string') {
    return null;
  }
  const correct = value.correct === true;
  return {
    version: 1,
    selectedId: value.selectedId ?? null,
    correct,
    locked: correct || value.locked === true,
  };
}

/**
 * A panel question whose media remains independently interactive. Only the
 * answer strip is a button, so rotating or zooming a Plotly panel cannot submit
 * an answer.
 */
export function PersistedPanelChoice({
  persistenceKey,
  title,
  options,
  correctId,
  typeLabel = '面板单选题',
  feedback = {},
  onComplete,
  moduleId = currentModuleId(),
  className,
}: PersistedPanelChoiceProps) {
  const rootRef = useRef<HTMLElement | null>(null);
  const completedFromUserRef = useRef(false);
  const stateKey = persistenceKey.startsWith('question:')
    ? persistenceKey
    : `question:${persistenceKey}`;
  const activity = usePersistedActivity<PersistedPanelChoiceState>({
    stateKey,
    moduleId,
    createInitial: initialPanelState,
    normalizeState: normalizePanelState,
    getElement: () => rootRef.current,
  });
  const selectedId = activity.state?.selectedId ?? null;
  const locked = activity.state?.locked === true;

  function select(optionId: string) {
    if (!activity.hydrated || locked) return;
    const correct = optionId === correctId;
    const next: PersistedPanelChoiceState = {
      version: 1,
      selectedId: optionId,
      correct,
      locked: correct,
    };
    activity.commit('answer_select', next, {
      question_type: 'panel-choice',
      selected_values: [optionId],
      correct,
      submitted: true,
      result: {
        ok: correct,
        answer: [optionId],
        tone: correct ? 'correct' : 'wrong',
      },
    });

    if (correct && !completedFromUserRef.current) {
      completedFromUserRef.current = true;
      onComplete?.();
    }
  }

  const feedbackStatus = selectedId === null
    ? 'info'
    : activity.state?.correct
      ? 'correct'
      : 'wrong';
  const feedbackMessage = selectedId === null
    ? feedback.initial
    : activity.state?.correct
      ? feedback.correct
      : feedback.wrong;
  const feedbackLabel = selectedId === null
    ? '判断提示'
    : activity.state?.correct
      ? '判断正确'
      : '再观察一次';

  return (
    <section
      ref={rootRef}
      className={classNames('dl-question', 'dl-question--panel-choice', className)}
      data-question-type="panel-choice"
      data-submit-mode="instant"
      data-state-key={stateKey}
      data-telemetry-manual
      aria-busy={!activity.hydrated}
      aria-label={typeof typeLabel === 'string' ? typeLabel : undefined}
    >
      <header className="dl-question-head">
        <span className="dl-question-type">{typeLabel}</span>
        <strong className="dl-question-stem">{title}</strong>
      </header>
      <div className="dl-panel-choice-grid" role="radiogroup">
        {options.map((option, index) => {
          const chosen = selectedId === option.id;
          const markedCorrect = chosen && activity.state?.correct === true;
          const markedWrong = chosen && selectedId !== null
            && activity.state?.correct !== true;
          return (
            <article
              className={classNames(
                'dl-panel-choice',
                'activation-panel-choice',
                chosen && 'is-selected',
                markedCorrect && 'is-correct',
                markedWrong && 'is-wrong',
              )}
              key={option.id}
            >
              <div className="dl-panel-choice-media" data-panel-media>
                {option.media}
              </div>
              <button
                className="dl-panel-choice-answer activation-panel-choice-answer"
                type="button"
                role="radio"
                aria-checked={chosen}
                disabled={!activity.hydrated || locked}
                onClick={() => select(option.id)}
              >
                <span className="dl-panel-choice-key">
                  {option.key ?? String.fromCharCode(65 + index)}
                </span>
                <span className="dl-panel-choice-copy">
                  <strong className="dl-panel-choice-title">{option.title}</strong>
                  {option.caption !== undefined && (
                    <span className="dl-panel-choice-caption">{option.caption}</span>
                  )}
                </span>
              </button>
            </article>
          );
        })}
      </div>
      <Feedback
        status={feedbackStatus}
        label={feedbackLabel}
        message={feedbackMessage}
        className="dl-question-feedback"
        hidden={feedbackMessage === undefined || feedbackMessage === null}
      />
    </section>
  );
}
