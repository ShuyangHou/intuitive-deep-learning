import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { Button, Callout, ContentBlock } from '../../shared/react';
import { BoundaryCanvas } from '../components/BoundaryCanvas';
import {
  advanceBoundaryLevel,
  clearBoundary,
  createBoundaryChallengeState,
  normalizeBoundaryChallengeState,
  replaceBoundaryPoints,
  scoreBoundary,
  type BoundaryChallengeState,
  type BoundaryVector,
} from '../model/boundaryEngine';
import {
  createDefaultBoundaryLevels,
  createDefaultClassificationScenario,
  normalizeBoundaryLevels,
  normalizeClassificationScenario,
  type BoundaryLevelDefinition,
  type ClassificationScenario,
} from '../model/scenarioTypes';
import '../mlp-boundary.css';

export type BoundaryChallengeCommit =
  | {
      type: 'boundary-drawn';
      level: 0 | 1 | 2;
      outcome: 'invalid' | 'retry' | 'passed';
      score: number | null;
      state: BoundaryChallengeState;
    }
  | {
      type: 'boundary-cleared';
      level: 0 | 1 | 2;
      state: BoundaryChallengeState;
    }
  | {
      type: 'boundary-points-replaced';
      level: 0 | 1 | 2;
      state: BoundaryChallengeState;
    };

export interface BoundaryChallengeBlockProps {
  state?: BoundaryChallengeState;
  scenario?: ClassificationScenario;
  levels?: BoundaryLevelDefinition[];
  disabled?: boolean;
  lessonStepComplete?: boolean;
  onStateChange?: (state: BoundaryChallengeState) => void;
  onCommit?: (event: BoundaryChallengeCommit) => void;
  onComplete?: (state: BoundaryChallengeState) => void;
}

function feedbackForState(
  state: BoundaryChallengeState,
  scenario: ClassificationScenario,
): {
  tone: 'orange' | 'red' | 'green';
  label: string;
  text: string;
} {
  if (state.invalidPath) {
    return {
      tone: 'red',
      label: '未达标提示',
      text: '边界需要横跨画布：可以从左画到右，也可以从上画到下。',
    };
  }
  if (state.passed) {
    return {
      tone: 'green',
      label: '达标提示',
      text:
        state.level === 0
          ? '通过！现在加入一些更接近真实调研的噪声样本。'
          : state.level === 2
            ? '通过！你已经亲手完成三种难度的分类边界。'
            : '通过！下一种分布即将出现。',
    };
  }
  if (state.scored) {
    return {
      tone: 'red',
      label: '未达标提示',
      text: '还差一点。观察带橙色外圈的错分点，再画一次。',
    };
  }
  return {
    tone: 'orange',
    label: '操作提示',
    text:
      state.level === 1
        ? '新增的噪声样本已经浮现。请不要沿用刚才的线，在新的分布上重新画一次。'
        : `观察“${scenario.negativeLabel}”和“${scenario.positiveLabel}”两类样本，画一条边界把它们分开。`,
  };
}

export function BoundaryChallengeBlock({
  state: controlledState,
  scenario: scenarioProp,
  levels: levelsProp,
  disabled = false,
  lessonStepComplete = false,
  onStateChange,
  onCommit,
  onComplete,
}: BoundaryChallengeBlockProps) {
  const [localState, setLocalState] = useState(createBoundaryChallengeState);
  const scenario = useMemo(
    () =>
      normalizeClassificationScenario(
        scenarioProp ?? createDefaultClassificationScenario(),
      ),
    [scenarioProp],
  );
  const levels = useMemo(
    () =>
      normalizeBoundaryLevels(
        levelsProp ?? createDefaultBoundaryLevels(scenario),
        scenario,
      ),
    [levelsProp, scenario],
  );
  const normalizedControlledState = useMemo(
    () =>
      controlledState === undefined
        ? null
        : normalizeBoundaryChallengeState(controlledState),
    [controlledState],
  );
  const state = normalizedControlledState ?? localState;
  const stateRef = useRef(state);
  stateRef.current = state;
  const [celebrationState, setCelebrationState] =
    useState<BoundaryChallengeState | null>(null);
  const [noiseRevealStartedAt, setNoiseRevealStartedAt] =
    useState<number | null>(null);
  const completionNotifiedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const notifyComplete = useCallback((
    snapshot: BoundaryChallengeState,
    remember = true,
  ) => {
    if (!snapshot.completed || completionNotifiedRef.current) return;
    if (remember) completionNotifiedRef.current = true;
    onCompleteRef.current?.(snapshot);
  }, []);

  const applyState = useCallback(
    (next: BoundaryChallengeState) => {
      const normalized = normalizeBoundaryChallengeState(next);
      setLocalState(normalized);
      onStateChange?.(normalized);
      return normalized;
    },
    [onStateChange],
  );

  useEffect(() => {
    if (!celebrationState?.pendingAdvanceAt) return;
    const delay = Math.max(
      0,
      celebrationState.pendingAdvanceAt - Date.now(),
    );
    const timer = window.setTimeout(() => {
      setCelebrationState(null);
      if (celebrationState.level === 0) {
        setNoiseRevealStartedAt(window.performance.now());
      } else if (celebrationState.level === 2) {
        notifyComplete(stateRef.current);
      }
    }, delay);
    return () => window.clearTimeout(timer);
  }, [celebrationState, notifyComplete]);

  const handleDrawEnd = (path: BoundaryVector[]) => {
    if (disabled) return;
    const result = scoreBoundary(stateRef.current, path, levels);
    const attemptedState = result.state;
    const persistedState = attemptedState.passed
      ? advanceBoundaryLevel(attemptedState)
      : attemptedState;
    const next = applyState(persistedState);
    if (attemptedState.passed) {
      setCelebrationState(attemptedState);
      if (attemptedState.level !== 0) setNoiseRevealStartedAt(null);
    }
    onCommit?.({
      type: 'boundary-drawn',
      level: attemptedState.level,
      outcome:
        !result.valid
          ? 'invalid'
          : attemptedState.passed
            ? 'passed'
            : 'retry',
      score: attemptedState.score,
      state: next,
    });
  };

  const displayState = celebrationState ?? state;
  const feedback = feedbackForState(displayState, scenario);
  const level = levels[displayState.level];
  const scoreText =
    displayState.score === null
      ? '--'
      : `${Math.round(displayState.score * 100)}%`;
  const scoreStyle = {
    '--mlp-boundary-score':
      displayState.score === null
        ? '0deg'
        : `${displayState.score * 360}deg`,
  } as CSSProperties;
  const showRecoveryContinue =
    state.completed &&
    !lessonStepComplete &&
    celebrationState === null &&
    !completionNotifiedRef.current;

  return (
    <ContentBlock
      className="mlp-boundary-challenge"
      data-telemetry-manual
    >
      <header className="mlp-boundary-challenge-head">
        <div>
          <span className="mlp-boundary-kicker">先由你来寻找边界</span>
          <h2>我们收集了很多数据，并将它们渲染在下方面板中</h2>
          <p>{level.description}</p>
        </div>
        <div className="mlp-boundary-progress" aria-label="挑战进度">
          {levels.map((_, index) => (
            <span key={index} className="mlp-boundary-progress-part">
              {index > 0 && <i aria-hidden="true" />}
              <b
                className={
                  index < displayState.level ||
                  (index === displayState.level && displayState.passed)
                    ? 'is-done'
                    : index === displayState.level
                      ? 'is-active'
                      : ''
                }
                aria-current={
                  index === displayState.level ? 'step' : undefined
                }
              >
                {index + 1}
              </b>
            </span>
          ))}
        </div>
      </header>

      <Callout
        tone="blue"
        label="观察提示"
        text={scenario.boundaryNote}
        className="mlp-boundary-note"
      />

      <div className="mlp-boundary-play-layout">
        <BoundaryCanvas
          state={displayState}
          scenario={scenario}
          noiseRevealStartedAt={noiseRevealStartedAt}
          disabled={disabled || celebrationState !== null}
          onDrawEnd={handleDrawEnd}
        />

        <aside className="mlp-boundary-score-card">
          <div className="mlp-boundary-level-label">
            <span>当前挑战</span>
            <strong>{level.name}</strong>
          </div>
          <div
            className={`mlp-boundary-score-ring${
              displayState.passed ? ' is-pass' : ''
            }`}
            style={scoreStyle}
          >
            <strong>{scoreText}</strong>
            <span>正确率</span>
          </div>
          <div className="mlp-boundary-target">
            <span>通过要求</span>
            <strong>{Math.round(level.target * 100)}%</strong>
          </div>
          <Callout
            tone={feedback.tone}
            label={feedback.label}
            text={feedback.text}
            className="mlp-boundary-score-message"
            aria-live="polite"
          />
          <div className="mlp-boundary-actions">
            <Button
              disabled={disabled || celebrationState !== null}
              onClick={() => {
                const next = applyState(clearBoundary(stateRef.current));
                onCommit?.({
                  type: 'boundary-cleared',
                  level: next.level,
                  state: next,
                });
              }}
            >
              重新绘制
            </Button>
            <Button
              disabled={disabled || celebrationState !== null}
              onClick={() => {
                const next = applyState(
                  replaceBoundaryPoints(stateRef.current),
                );
                setNoiseRevealStartedAt(
                  next.level === 1 ? window.performance.now() : null,
                );
                onCommit?.({
                  type: 'boundary-points-replaced',
                  level: next.level,
                  state: next,
                });
              }}
            >
              换组散点
            </Button>
          </div>
          {showRecoveryContinue && (
            <Button
              variant="primary"
              onClick={() => notifyComplete(state, false)}
            >
              继续进入 MLP 实验
            </Button>
          )}
        </aside>
      </div>
    </ContentBlock>
  );
}

export {
  createBoundaryChallengeState,
  normalizeBoundaryChallengeState,
};
export type { BoundaryChallengeState };
