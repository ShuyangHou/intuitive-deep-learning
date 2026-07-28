import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
} from 'react';
import {
  currentModuleId,
  emitTelemetry,
  type TelemetryStateEntry,
} from '../../shared/react';

export type ActivityUpdater<T> = T | ((current: T) => T);

interface PersistedActivityOptions<T> {
  stateKey: string;
  createInitial: () => T;
  normalizeState?: (stored: unknown) => T | null;
  moduleId?: string;
  initializationEvent?: string;
  initializationReady?: boolean;
  getElement?: () => Element | null;
}

interface PersistedActivityResult<T> {
  state: T | null;
  stateRef: MutableRefObject<T | null>;
  hydrated: boolean;
  persistenceAvailable: boolean;
  setDraft: (update: ActivityUpdater<T>) => T | null;
  commit: (
    eventName: string,
    update: ActivityUpdater<T>,
    properties?: Record<string, unknown>,
  ) => T | null;
}

type ModuleStateDocument = {
  ok?: boolean;
  states?: Record<string, TelemetryStateEntry<unknown>>;
};

const initializedKeys = new Set<string>();

function resolveUpdate<T>(
  current: T | null,
  update: ActivityUpdater<T>,
): T | null {
  if (current === null) return null;
  return typeof update === 'function'
    ? (update as (value: T) => T)(current)
    : update;
}

export async function loadPersistedActivity<T>(
  stateKey: string,
  moduleId = currentModuleId(),
): Promise<{ ok: true; entry: TelemetryStateEntry<T> | null } | { ok: false }> {
  const getModuleState = window.__DL_TELEMETRY__?.getModuleState;
  if (!getModuleState) return { ok: false };

  try {
    const document = await getModuleState(moduleId) as ModuleStateDocument | undefined;
    if (!document || document.ok !== true) return { ok: false };
    return {
      ok: true,
      entry: (
        document.states?.[stateKey] as TelemetryStateEntry<T> | undefined
      ) ?? null,
    };
  } catch {
    return { ok: false };
  }
}

/**
 * Module-private SQLite adapter.
 *
 * Hydration is read-only. Draft updates never emit telemetry. A semantic UI
 * operation calls `commit` once and stores its complete, serializable snapshot.
 */
export function usePersistedActivity<T>({
  stateKey,
  createInitial,
  normalizeState,
  moduleId = currentModuleId(),
  initializationEvent,
  initializationReady = true,
  getElement,
}: PersistedActivityOptions<T>): PersistedActivityResult<T> {
  const [state, setState] = useState<T | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [persistenceAvailable, setPersistenceAvailable] = useState(false);
  const stateRef = useRef<T | null>(null);
  const persistenceAvailableRef = useRef(false);
  const initializationPendingRef = useRef(false);
  const generationRef = useRef(0);

  const createInitialRef = useRef(createInitial);
  const normalizeStateRef = useRef(normalizeState);
  const getElementRef = useRef(getElement);
  createInitialRef.current = createInitial;
  normalizeStateRef.current = normalizeState;
  getElementRef.current = getElement;

  useEffect(() => {
    let active = true;
    const generation = ++generationRef.current;
    stateRef.current = null;
    persistenceAvailableRef.current = false;
    initializationPendingRef.current = false;
    setState(null);
    setHydrated(false);
    setPersistenceAvailable(false);

    void loadPersistedActivity<unknown>(stateKey, moduleId).then((result) => {
      if (!active || generation !== generationRef.current) return;
      if (!result.ok) {
        const next = createInitialRef.current();
        stateRef.current = next;
        setState(next);
        setHydrated(true);
        return;
      }

      let restored: T | null = null;
      if (result.entry !== null) {
        try {
          restored = normalizeStateRef.current
            ? normalizeStateRef.current(result.entry.state)
            : result.entry.state as T;
        } catch {
          restored = null;
        }
        if (restored === null) {
          const next = createInitialRef.current();
          stateRef.current = next;
          setState(next);
          setHydrated(true);
          return;
        }
      }

      const next = restored ?? createInitialRef.current();
      stateRef.current = next;
      persistenceAvailableRef.current = true;
      initializationPendingRef.current = result.entry === null;
      setState(next);
      setPersistenceAvailable(true);
      setHydrated(true);
    });

    return () => {
      active = false;
    };
  }, [moduleId, stateKey]);

  useEffect(() => {
    if (
      !hydrated ||
      !persistenceAvailable ||
      !initializationReady ||
      !initializationEvent ||
      !initializationPendingRef.current
    ) {
      return;
    }
    const current = stateRef.current;
    if (current === null) return;

    initializationPendingRef.current = false;
    const initializationKey =
      `${moduleId}:${stateKey}:${initializationEvent}`;
    if (initializedKeys.has(initializationKey)) return;
    initializedKeys.add(initializationKey);
    emitTelemetry(initializationEvent, getElementRef.current?.() ?? null, {
      state_key: stateKey,
      state: current,
    });
  }, [
    hydrated,
    initializationEvent,
    initializationReady,
    moduleId,
    persistenceAvailable,
    stateKey,
  ]);

  const setDraft = useCallback((update: ActivityUpdater<T>): T | null => {
    if (!hydrated) return null;
    const next = resolveUpdate(stateRef.current, update);
    if (next === null) return null;
    stateRef.current = next;
    setState(next);
    return next;
  }, [hydrated]);

  const commit = useCallback((
    eventName: string,
    update: ActivityUpdater<T>,
    properties: Record<string, unknown> = {},
  ): T | null => {
    if (!hydrated) return null;
    const next = resolveUpdate(stateRef.current, update);
    if (next === null) return null;
    stateRef.current = next;
    setState(next);
    if (persistenceAvailableRef.current) {
      emitTelemetry(eventName, getElementRef.current?.() ?? null, {
        ...properties,
        state_key: stateKey,
        state: next,
      });
    }
    return next;
  }, [hydrated, stateKey]);

  return {
    state,
    stateRef,
    hydrated,
    persistenceAvailable,
    setDraft,
    commit,
  };
}
