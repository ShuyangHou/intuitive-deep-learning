import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Button, ContentBlock, TextInput } from '../../shared/react';
import {
  createDefaultBoundaryLevels,
  createDefaultClassificationScenario,
  normalizeBoundaryLevels,
  normalizeClassificationScenario,
  parseClassificationScenario,
  type BoundaryLevelDefinition,
  type ClassificationScenario,
  type ParsedClassificationScenario,
} from '../model/scenarioTypes';
import {
  classificationScenarioErrorMessage,
  requestClassificationScenario,
} from '../services/classificationScenario';
import '../mlp-boundary.css';

export type ScenarioIntroStatus = 'idle' | 'loading' | 'success' | 'error';

export interface ScenarioIntroState {
  version: 1;
  input: string;
  status: ScenarioIntroStatus;
  submittedSubject: string | null;
  scenario: ClassificationScenario;
  introLines: string[];
  levels: BoundaryLevelDefinition[];
  errorMessage: string | null;
  challengeRevealed: boolean;
}

export interface ScenarioIntroCommit {
  type: 'scenario-submitted' | 'scenario-input-committed';
  subject: string;
  outcome?: 'success' | 'error';
  state: ScenarioIntroState;
}

export interface ScenarioIntroBlockProps {
  state?: ScenarioIntroState;
  disabled?: boolean;
  lessonStepComplete?: boolean;
  onStateChange?: (state: ScenarioIntroState) => void;
  onCommit?: (event: ScenarioIntroCommit) => void;
  onComplete?: (result: ParsedClassificationScenario) => void;
}

const EXAMPLE_SUGGESTIONS = [
  '网球',
  '游泳',
  '王者荣耀',
  '牛肉拉面',
  '露营',
  '摄影',
  '烘焙',
  '羽毛球',
  '科幻电影',
  '咖啡',
  '旅行',
  '吉他',
  '跑步',
  '宠物猫',
  '火锅',
  '登山',
  '动漫',
  '编程',
] as const;

export function createInitialScenarioIntroState(): ScenarioIntroState {
  const scenario = createDefaultClassificationScenario();
  return {
    version: 1,
    input: '',
    status: 'idle',
    submittedSubject: null,
    scenario,
    introLines: [],
    levels: createDefaultBoundaryLevels(scenario),
    errorMessage: null,
    challengeRevealed: false,
  };
}

export function normalizeScenarioIntroState(value: unknown): ScenarioIntroState {
  const initial = createInitialScenarioIntroState();
  if (!value || typeof value !== 'object') return initial;
  const candidate = value as Partial<ScenarioIntroState>;
  const scenario = normalizeClassificationScenario(candidate.scenario);
  const rawStatus = candidate.status;
  const status: ScenarioIntroStatus =
    rawStatus === 'success'
      ? 'success'
      : rawStatus === 'error'
        ? 'error'
        : rawStatus === 'loading'
          ? 'error'
          : 'idle';
  const submittedSubject =
    typeof candidate.submittedSubject === 'string' &&
    candidate.submittedSubject.trim()
      ? candidate.submittedSubject.trim().slice(0, 80)
      : null;
  const introLines = Array.isArray(candidate.introLines)
    ? candidate.introLines
        .map((line) => String(line ?? '').trim())
        .filter(Boolean)
        .slice(0, 4)
        .map((line) => line.slice(0, 360))
    : [];

  return {
    version: 1,
    input:
      typeof candidate.input === 'string'
        ? candidate.input.slice(0, 80)
        : '',
    status: status === 'success' && introLines.length === 0 ? 'idle' : status,
    submittedSubject,
    scenario,
    introLines,
    levels: normalizeBoundaryLevels(candidate.levels, scenario),
    errorMessage:
      status === 'error'
        ? typeof candidate.errorMessage === 'string' &&
          candidate.errorMessage.trim()
          ? candidate.errorMessage.slice(0, 300)
          : rawStatus === 'loading'
            ? '上次分析在刷新前尚未完成，请重新提交。'
            : '本次分析未完成，请重新提交。'
        : null,
    challengeRevealed:
      status === 'success' && introLines.length > 0
        ? true
        : Boolean(candidate.challengeRevealed),
  };
}

function parsedFromState(state: ScenarioIntroState): ParsedClassificationScenario {
  return {
    scenario: state.scenario,
    introLines: state.introLines,
    levels: state.levels,
  };
}

export function ScenarioIntroBlock({
  state: controlledState,
  disabled = false,
  lessonStepComplete = false,
  onStateChange,
  onCommit,
  onComplete,
}: ScenarioIntroBlockProps) {
  const [localState, setLocalState] = useState(createInitialScenarioIntroState);
  const normalizedControlledState = useMemo(
    () =>
      controlledState === undefined
        ? null
        : normalizeScenarioIntroState(controlledState),
    [controlledState],
  );
  const state = normalizedControlledState ?? localState;
  const stateRef = useRef(state);
  stateRef.current = state;

  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [liveOutput, setLiveOutput] = useState<string[] | null>(null);
  const [liveThinking, setLiveThinking] = useState<string | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const streamRunRef = useRef(0);
  const streamingRef = useRef(false);
  const completedKeyRef = useRef<string | null>(null);
  const skipNextBlurCommitRef = useRef(false);

  const applyState = useCallback(
    (next: ScenarioIntroState) => {
      const normalized = normalizeScenarioIntroState(next);
      setLocalState(normalized);
      onStateChange?.(normalized);
      return normalized;
    },
    [onStateChange],
  );

  const notifyComplete = useCallback(
    (snapshot: ScenarioIntroState, remember = true) => {
      if (snapshot.status !== 'success' || !snapshot.submittedSubject) return;
      const key = `${snapshot.submittedSubject}\u0000${snapshot.introLines.join(
        '\u0001',
      )}`;
      if (completedKeyRef.current === key) return;
      if (remember) completedKeyRef.current = key;
      onComplete?.(parsedFromState(snapshot));
    },
    [onComplete],
  );

  const playLiveLines = useCallback(
    (lines: string[], snapshot: ScenarioIntroState) => {
      const run = streamRunRef.current + 1;
      streamRunRef.current = run;
      streamingRef.current = true;
      setLiveThinking('分析完成，正在整理结果');
      setLiveOutput(['']);
      let lineIndex = 0;
      let characterIndex = 0;
      let renderedLines = [''];

      const tick = () => {
        if (streamRunRef.current !== run) return;
        const line = lines[lineIndex] ?? '';
        characterIndex += 1;
        renderedLines = [
          ...renderedLines.slice(0, lineIndex),
          line.slice(0, characterIndex),
        ];
        setLiveOutput(renderedLines);
        if (characterIndex <= line.length) {
          window.setTimeout(tick, 14 + Math.random() * 18);
          return;
        }
        if (lineIndex < lines.length - 1) {
          lineIndex += 1;
          characterIndex = 0;
          renderedLines = [...renderedLines, ''];
          window.setTimeout(tick, 150);
          return;
        }
        streamingRef.current = false;
        setLiveThinking('第一张散点图已准备好');
        setLiveOutput(null);
        notifyComplete(snapshot);
      };

      window.setTimeout(tick, 20);
    },
    [notifyComplete],
  );

  useEffect(() => {
    if (
      disabled ||
      state.input.trim() ||
      state.status === 'loading' ||
      state.status === 'success'
    ) {
      return;
    }
    const timer = window.setInterval(() => {
      setSuggestionIndex(
        (current) => (current + 1) % EXAMPLE_SUGGESTIONS.length,
      );
    }, 1800);
    return () => window.clearInterval(timer);
  }, [disabled, state.input, state.status]);

  useEffect(
    () => () => {
      requestRef.current?.abort();
      streamRunRef.current += 1;
      streamingRef.current = false;
    },
    [],
  );

  const submitScenario = async () => {
    if (disabled || state.status === 'loading') return;
    if (state.status === 'success') {
      notifyComplete(state);
      return;
    }

    const subject =
      state.input.trim() || EXAMPLE_SUGGESTIONS[suggestionIndex];
    skipNextBlurCommitRef.current = true;
    const controller = new AbortController();
    requestRef.current?.abort();
    requestRef.current = controller;
    setLiveOutput([]);
    setLiveThinking(`正在把“${subject}”转成分类问题`);
    const loadingState = applyState({
      ...state,
      input: subject,
      status: 'loading',
      submittedSubject: subject,
      introLines: [],
      errorMessage: null,
      challengeRevealed: false,
    });
    window.setTimeout(() => {
      skipNextBlurCommitRef.current = false;
    }, 0);

    const waitingTimer = window.setTimeout(() => {
      if (!controller.signal.aborted) setLiveThinking('正在分析你的输入，请稍候');
    }, 520);

    try {
      const rawResult = await requestClassificationScenario(
        subject,
        controller.signal,
      );
      window.clearTimeout(waitingTimer);
      if (controller.signal.aborted) return;
      const parsed = parseClassificationScenario(rawResult, subject);
      const successState = applyState({
        ...loadingState,
        status: 'success',
        scenario: parsed.scenario,
        introLines: parsed.introLines,
        levels: parsed.levels,
        errorMessage: null,
        challengeRevealed: true,
      });
      onCommit?.({
        type: 'scenario-submitted',
        subject,
        outcome: 'success',
        state: successState,
      });
      playLiveLines(parsed.introLines, successState);
    } catch (error) {
      window.clearTimeout(waitingTimer);
      if (controller.signal.aborted) return;
      const message = classificationScenarioErrorMessage(error);
      setLiveThinking('本次分析未完成');
      setLiveOutput([message]);
      const errorState = applyState({
        ...loadingState,
        status: 'error',
        errorMessage: message,
        challengeRevealed: false,
      });
      onCommit?.({
        type: 'scenario-submitted',
        subject,
        outcome: 'error',
        state: errorState,
      });
    } finally {
      if (requestRef.current === controller) requestRef.current = null;
    }
  };

  const output =
    liveOutput ??
    (state.status === 'success'
      ? state.introLines
      : state.status === 'error' && state.errorMessage
        ? [state.errorMessage]
        : []);
  const panelVisible =
    state.status !== 'idle' || output.length > 0 || liveThinking !== null;
  const thinkingText =
    liveThinking ??
    (state.status === 'success'
      ? '第一张散点图已准备好'
      : state.status === 'error'
        ? '本次分析未完成'
        : '正在把你的例子转成分类问题');
  const completionKey =
    state.status === 'success' && state.submittedSubject
      ? `${state.submittedSubject}\u0000${state.introLines.join('\u0001')}`
      : null;
  const showRecoveryContinue =
    completionKey !== null &&
    !lessonStepComplete &&
    liveOutput === null &&
    completedKeyRef.current !== completionKey;

  return (
    <ContentBlock
      className="mlp-boundary-intro"
      title="让我们先从你熟悉的事物开始熟悉MLP吧！"
      subtitle="告诉我，你喜欢什么？在下方写一个你熟悉的事物。让我们一起看看能做些什么？"
      data-telemetry-manual
    >
      <div className="mlp-boundary-example-form">
        <TextInput
          aria-label="输入你喜欢的事物"
          autoComplete="off"
          disabled={disabled || state.status === 'loading' || state.status === 'success'}
          maxLength={80}
          placeholder={EXAMPLE_SUGGESTIONS[suggestionIndex]}
          value={state.input}
          onChange={(event) => {
            applyState({
              ...stateRef.current,
              input: event.target.value,
              status:
                stateRef.current.status === 'error'
                  ? 'idle'
                  : stateRef.current.status,
              errorMessage: null,
            });
          }}
          onBlur={() => {
            if (skipNextBlurCommitRef.current) {
              skipNextBlurCommitRef.current = false;
              return;
            }
            const snapshot = stateRef.current;
            onCommit?.({
              type: 'scenario-input-committed',
              subject: snapshot.input.trim(),
              state: snapshot,
            });
          }}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            void submitScenario();
          }}
        />
        <Button
          variant="primary"
          type="button"
          loading={state.status === 'loading'}
          disabled={disabled || state.status === 'success'}
          onClick={() => {
            void submitScenario();
          }}
          onPointerDown={() => {
            skipNextBlurCommitRef.current = true;
          }}
        >
          开始分析
        </Button>
      </div>

      <div
        className={`mlp-boundary-stream-panel${
          panelVisible ? ' is-visible' : ''
        }`}
        aria-live="polite"
      >
        <div
          className={`mlp-boundary-thinking${
            state.status === 'success' || state.status === 'error'
              ? ' is-done'
              : ''
          }`}
        >
          <i />
          <span>{thinkingText}</span>
        </div>
        <div
          className={`mlp-boundary-stream-output${
            state.status === 'error' ? ' is-error' : ''
          }`}
        >
          {output.map((line, index) => (
            <p key={`${index}-${line.slice(0, 24)}`}>{line}</p>
          ))}
        </div>
      </div>
      {showRecoveryContinue && (
        <div className="mlp-boundary-recovery-action">
          <Button
            variant="primary"
            type="button"
            onClick={() => notifyComplete(state, false)}
          >
            继续手绘边界
          </Button>
        </div>
      )}
    </ContentBlock>
  );
}
