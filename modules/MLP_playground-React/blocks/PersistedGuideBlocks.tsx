import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from 'react';
import { ActivityGate } from '../components/ActivityGate';
import {
  loadPersistedActivity,
  usePersistedActivity,
} from '../components/usePersistedActivity';
import {
  BoundaryChallengeBlock,
  createBoundaryChallengeState,
  normalizeBoundaryChallengeState,
  type BoundaryChallengeCommit,
} from './BoundaryChallengeBlock';
import {
  ScenarioIntroBlock,
  createInitialScenarioIntroState,
  normalizeScenarioIntroState,
  type ScenarioIntroCommit,
  type ScenarioIntroState,
} from './ScenarioIntroBlock';

const INTRO_STATE_KEY = 'activity:mlp-intro';
const BOUNDARY_STATE_KEY = 'activity:mlp-boundary';

interface PersistedGuideBlockProps {
  onComplete: () => void;
  lessonStepComplete?: boolean;
}

interface MlpGuideSession {
  introStateRef: MutableRefObject<ScenarioIntroState | null>;
  introPersistenceAvailableRef: MutableRefObject<boolean | null>;
}

const MlpGuideSessionContext = createContext<MlpGuideSession | null>(null);

export function MlpGuideSessionProvider({
  children,
}: {
  children: ReactNode;
}) {
  const introStateRef = useRef<ScenarioIntroState | null>(null);
  const introPersistenceAvailableRef = useRef<boolean | null>(null);
  const sessionRef = useRef<MlpGuideSession>({
    introStateRef,
    introPersistenceAvailableRef,
  });

  return (
    <MlpGuideSessionContext.Provider value={sessionRef.current}>
      {children}
    </MlpGuideSessionContext.Provider>
  );
}

function restoreScenarioIntroState(value: unknown): ScenarioIntroState | null {
  if (
    !value ||
    typeof value !== 'object' ||
    (value as { version?: unknown }).version !== 1
  ) {
    return null;
  }
  try {
    return normalizeScenarioIntroState(value);
  } catch {
    return null;
  }
}

function restoreBoundaryChallengeState(value: unknown) {
  if (
    !value ||
    typeof value !== 'object' ||
    (value as { version?: unknown }).version !== 1
  ) {
    return null;
  }
  try {
    return normalizeBoundaryChallengeState(value);
  } catch {
    return null;
  }
}

export function PersistedScenarioIntroBlock({
  onComplete,
  lessonStepComplete = false,
}: PersistedGuideBlockProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const guideSession = useContext(MlpGuideSessionContext);
  const activity = usePersistedActivity<ScenarioIntroState>({
    stateKey: INTRO_STATE_KEY,
    createInitial: createInitialScenarioIntroState,
    normalizeState: restoreScenarioIntroState,
    initializationEvent: 'mlp_intro_initialized',
    getElement: () => rootRef.current,
  });

  useEffect(() => {
    if (!guideSession || !activity.hydrated) return;
    guideSession.introPersistenceAvailableRef.current =
      activity.persistenceAvailable;
  }, [activity.hydrated, activity.persistenceAvailable, guideSession]);

  const handleCommit = (event: ScenarioIntroCommit) => {
    const eventName =
      event.type === 'scenario-input-committed'
        ? 'mlp_intro_input_commit'
        : event.outcome === 'success'
          ? 'mlp_intro_resolved'
          : 'mlp_intro_failed';
    if (event.type === 'scenario-submitted' && event.outcome === 'success') {
      if (guideSession) {
        guideSession.introStateRef.current = event.state;
        guideSession.introPersistenceAvailableRef.current =
          activity.persistenceAvailable;
      }
    }
    activity.commit(eventName, event.state, {
      subject: event.subject,
      outcome: event.outcome,
    });
  };

  return (
    <div ref={rootRef} data-telemetry-manual>
      <ActivityGate
        hydrated={activity.hydrated}
      >
        {activity.state && (
          <ScenarioIntroBlock
            state={activity.state}
            lessonStepComplete={lessonStepComplete}
            onStateChange={activity.setDraft}
            onCommit={handleCommit}
            onComplete={onComplete}
          />
        )}
      </ActivityGate>
    </div>
  );
}

export function PersistedBoundaryChallengeBlock({
  onComplete,
  lessonStepComplete = false,
}: PersistedGuideBlockProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const guideSession = useContext(MlpGuideSessionContext);
  const immediateIntroState = guideSession?.introStateRef.current ?? null;
  const immediateIntroPersistenceAvailable =
    guideSession?.introPersistenceAvailableRef.current ?? null;
  const [introState, setIntroState] = useState<ScenarioIntroState | null>(
    immediateIntroState,
  );
  const [
    introPersistenceAvailable,
    setIntroPersistenceAvailable,
  ] = useState(
    immediateIntroState !== null &&
      immediateIntroPersistenceAvailable === true,
  );
  const activity = usePersistedActivity({
    stateKey: BOUNDARY_STATE_KEY,
    createInitial: createBoundaryChallengeState,
    normalizeState: restoreBoundaryChallengeState,
    initializationEvent: 'mlp_boundary_initialized',
    initializationReady:
      introState !== null && introPersistenceAvailable,
    getElement: () => rootRef.current,
  });

  useEffect(() => {
    if (immediateIntroState) {
      setIntroState(
        restoreScenarioIntroState(immediateIntroState) ??
          createInitialScenarioIntroState(),
      );
      setIntroPersistenceAvailable(
        immediateIntroPersistenceAvailable === true,
      );
      return;
    }
    let active = true;
    void loadPersistedActivity<ScenarioIntroState>(INTRO_STATE_KEY).then(
      (result) => {
        if (!active) return;
        if (!result.ok) {
          setIntroState(createInitialScenarioIntroState());
          setIntroPersistenceAvailable(false);
          return;
        }
        const restored = result.entry
          ? restoreScenarioIntroState(result.entry.state)
          : createInitialScenarioIntroState();
        if (restored === null) {
          setIntroState(createInitialScenarioIntroState());
          setIntroPersistenceAvailable(false);
          return;
        }
        setIntroPersistenceAvailable(true);
        setIntroState(restored);
      },
    );
    return () => {
      active = false;
    };
  }, [immediateIntroPersistenceAvailable, immediateIntroState]);

  const handleCommit = (event: BoundaryChallengeCommit) => {
    const eventName =
      event.type === 'boundary-drawn'
        ? 'mlp_boundary_attempt'
        : event.type === 'boundary-cleared'
          ? 'mlp_boundary_clear'
          : 'mlp_boundary_regenerate';
    const properties = {
      level: event.level + 1,
      outcome: event.type === 'boundary-drawn' ? event.outcome : undefined,
      score: event.type === 'boundary-drawn' ? event.score : undefined,
    };
    if (!introPersistenceAvailable) {
      activity.setDraft(event.state);
      return;
    }
    activity.commit(eventName, event.state, properties);
  };

  return (
    <div ref={rootRef} data-telemetry-manual>
      <ActivityGate
        hydrated={activity.hydrated && introState !== null}
      >
        {activity.state && introState && (
          <BoundaryChallengeBlock
            state={activity.state}
            scenario={introState.scenario}
            levels={introState.levels}
            lessonStepComplete={lessonStepComplete}
            onStateChange={activity.setDraft}
            onCommit={handleCommit}
            onComplete={onComplete}
          />
        )}
      </ActivityGate>
    </div>
  );
}
