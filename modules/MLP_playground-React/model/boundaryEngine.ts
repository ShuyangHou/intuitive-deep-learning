import type {
  BoundaryLevelDefinition,
  BoundaryLevelType,
} from './scenarioTypes';

export interface BoundaryVector {
  /** 画布宽度中的比例，范围 0–1。 */
  x: number;
  /** 画布高度中的比例，范围 0–1。 */
  y: number;
}

export interface BoundaryPoint extends BoundaryVector {
  label: 0 | 1;
  wrong: boolean;
  noise: boolean;
  alpha: number;
  revealDelay: number;
}

export interface BoundaryChallengeState {
  version: 1;
  level: 0 | 1 | 2;
  points: BoundaryPoint[];
  /** 第二关必须复用第一关样本，因此原始样本单独保留。 */
  baseSurvey: BoundaryPoint[];
  path: BoundaryVector[];
  scored: boolean;
  passed: boolean;
  score: number | null;
  flip: boolean;
  invalidPath: boolean;
  completed: boolean;
  /** 达标后延迟进入下一关，保持旧版 1150ms 的视觉节奏。 */
  pendingAdvanceAt: number | null;
}

export interface BoundaryScoreResult {
  state: BoundaryChallengeState;
  valid: boolean;
}

type RandomSource = () => number;

const LEVEL_TYPES: BoundaryLevelType[] = ['easy', 'woven', 'xor'];
export const BOUNDARY_ADVANCE_DELAY_MS = 1150;

function clamp(value: number, minimum = 0, maximum = 1): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function finiteNumber(value: unknown, fallback: number): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function randomNormal(random: RandomSource): number {
  let u = 0;
  let v = 0;
  while (!u) u = random();
  while (!v) v = random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function createPoint(
  x: number,
  y: number,
  label: 0 | 1,
  extra: Partial<BoundaryPoint> = {},
): BoundaryPoint {
  return {
    x: clamp(x, 0.12, 0.88),
    y: clamp(y, 0.12, 0.88),
    label,
    wrong: false,
    noise: false,
    alpha: 1,
    revealDelay: 0,
    ...extra,
  };
}

export function cloneBoundaryPoint(point: BoundaryPoint): BoundaryPoint {
  return { ...point };
}

export function createEasySurvey(
  random: RandomSource = Math.random,
): BoundaryPoint[] {
  const samples: BoundaryPoint[] = [];
  const margin = 0.12;
  const available = 1 - margin * 2;

  for (let index = 0; index < 70; index += 1) {
    const exceptionalNegative = random() < 0.08;
    const exceptionalPositive = random() < 0.08;
    const lowX = margin + available * (0.26 + randomNormal(random) * 0.12);
    const highX = margin + available * (0.74 + randomNormal(random) * 0.12);
    samples.push(
      createPoint(
        exceptionalNegative ? highX : lowX,
        (exceptionalNegative ? 0.36 : 0.68) + randomNormal(random) * 0.075,
        0,
      ),
    );
    samples.push(
      createPoint(
        exceptionalPositive ? lowX : highX,
        (exceptionalPositive ? 0.66 : 0.32) + randomNormal(random) * 0.075,
        1,
      ),
    );
  }
  return samples;
}

export function createNoisySurveySamples(
  random: RandomSource = Math.random,
): BoundaryPoint[] {
  const samples: BoundaryPoint[] = [];
  const margin = 0.12;

  for (let index = 0; index < 42; index += 1) {
    const label = (index % 2) as 0 | 1;
    const x = margin + random() * (1 - margin * 2);
    const expectedY = label
      ? 0.78 - x * 0.48
      : 0.42 + x * 0.32;
    const wave =
      Math.sin(x * Math.PI * 2.2 + (label ? 0.7 : 0)) * 0.045;
    let y = expectedY + wave + randomNormal(random) * 0.105;
    if (random() < 0.28) y = 0.5 + randomNormal(random) * 0.13;
    samples.push(
      createPoint(x, y, label, {
        noise: true,
        // 恢复态直接显示完整散点，不把刷新伪装成一次新动画。
        alpha: 1,
        revealDelay: index * 35 + random() * 160,
      }),
    );
  }
  return samples;
}

export function createXorSurvey(
  random: RandomSource = Math.random,
): BoundaryPoint[] {
  const samples: BoundaryPoint[] = [];
  const centers: Array<[number, number, 0 | 1]> = [
    [0.32, 0.32, 0],
    [0.68, 0.68, 0],
    [0.68, 0.32, 1],
    [0.32, 0.68, 1],
  ];

  centers.forEach(([centerX, centerY, label]) => {
    for (let index = 0; index < 38; index += 1) {
      samples.push(
        createPoint(
          centerX + randomNormal(random) * 0.085,
          centerY + randomNormal(random) * 0.085,
          label,
        ),
      );
    }
  });
  return samples;
}

function pointsForLevel(
  level: 0 | 1 | 2,
  baseSurvey: BoundaryPoint[],
  random: RandomSource,
): { points: BoundaryPoint[]; baseSurvey: BoundaryPoint[] } {
  if (level === 0) {
    const easy = createEasySurvey(random);
    return {
      points: easy.map(cloneBoundaryPoint),
      baseSurvey: easy.map(cloneBoundaryPoint),
    };
  }
  if (level === 1) {
    const base = baseSurvey.length > 0
      ? baseSurvey.map(cloneBoundaryPoint)
      : createEasySurvey(random);
    return {
      points: [
        ...base.map(cloneBoundaryPoint),
        ...createNoisySurveySamples(random),
      ],
      baseSurvey: base.map(cloneBoundaryPoint),
    };
  }
  return {
    points: createXorSurvey(random),
    baseSurvey: baseSurvey.map(cloneBoundaryPoint),
  };
}

export function createBoundaryChallengeState(
  random: RandomSource = Math.random,
): BoundaryChallengeState {
  const generated = pointsForLevel(0, [], random);
  return {
    version: 1,
    level: 0,
    points: generated.points,
    baseSurvey: generated.baseSurvey,
    path: [],
    scored: false,
    passed: false,
    score: null,
    flip: false,
    invalidPath: false,
    completed: false,
    pendingAdvanceAt: null,
  };
}

function normalizeVector(value: unknown): BoundaryVector | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<BoundaryVector>;
  const x = Number(candidate.x);
  const y = Number(candidate.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x: clamp(x), y: clamp(y) };
}

function normalizePoint(value: unknown): BoundaryPoint | null {
  const vector = normalizeVector(value);
  if (!vector || !value || typeof value !== 'object') return null;
  const candidate = value as Partial<BoundaryPoint>;
  return {
    ...vector,
    label: candidate.label === 1 ? 1 : 0,
    wrong: Boolean(candidate.wrong),
    noise: Boolean(candidate.noise),
    alpha: clamp(finiteNumber(candidate.alpha, 1)),
    revealDelay: Math.max(0, finiteNumber(candidate.revealDelay, 0)),
  };
}

function normalizePointArray(value: unknown): BoundaryPoint[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(normalizePoint)
    .filter((point): point is BoundaryPoint => point !== null)
    .slice(0, 400);
}

function normalizePath(value: unknown): BoundaryVector[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(normalizeVector)
    .filter((point): point is BoundaryVector => point !== null)
    .slice(0, 4000);
}

export function normalizeBoundaryChallengeState(
  value: unknown,
  random: RandomSource = Math.random,
): BoundaryChallengeState {
  if (!value || typeof value !== 'object') {
    return createBoundaryChallengeState(random);
  }
  const candidate = value as Partial<BoundaryChallengeState>;
  const rawLevel = Math.round(finiteNumber(candidate.level, 0));
  const level = Math.max(0, Math.min(2, rawLevel)) as 0 | 1 | 2;
  let baseSurvey = normalizePointArray(candidate.baseSurvey);
  let points = normalizePointArray(candidate.points);
  if (points.length === 0) {
    const generated = pointsForLevel(level, baseSurvey, random);
    points = generated.points;
    baseSurvey = generated.baseSurvey;
  }
  if (baseSurvey.length === 0 && level < 2) {
    baseSurvey = level === 0
      ? points.map(cloneBoundaryPoint)
      : createEasySurvey(random);
  }
  const scoreValue = Number(candidate.score);
  const score = Number.isFinite(scoreValue)
    ? clamp(scoreValue)
    : null;
  const scored = Boolean(candidate.scored && score !== null);
  const passed = Boolean(candidate.passed && scored);
  const pendingValue = Number(candidate.pendingAdvanceAt);
  const pendingAdvanceAt = passed && !candidate.completed
    ? (Number.isFinite(pendingValue) ? pendingValue : 0)
    : null;

  return {
    version: 1,
    level,
    points,
    baseSurvey,
    path: normalizePath(candidate.path),
    scored,
    passed,
    score,
    flip: Boolean(candidate.flip),
    invalidPath: Boolean(candidate.invalidPath),
    completed: Boolean(candidate.completed),
    pendingAdvanceAt,
  };
}

export function replaceBoundaryPoints(
  state: BoundaryChallengeState,
  random: RandomSource = Math.random,
): BoundaryChallengeState {
  const generated = pointsForLevel(state.level, state.baseSurvey, random);
  return {
    ...state,
    points: generated.points,
    baseSurvey: generated.baseSurvey,
    path: [],
    scored: false,
    passed: false,
    score: null,
    flip: false,
    invalidPath: false,
    pendingAdvanceAt: null,
  };
}

export function clearBoundary(
  state: BoundaryChallengeState,
): BoundaryChallengeState {
  return {
    ...state,
    points: state.points.map((point) => ({ ...point, wrong: false })),
    path: [],
    scored: false,
    passed: false,
    score: null,
    flip: false,
    invalidPath: false,
    pendingAdvanceAt: null,
  };
}

export function boundarySide(
  target: BoundaryVector,
  path: BoundaryVector[],
): 0 | 1 {
  let bestDistance = Number.POSITIVE_INFINITY;
  let bestSide = 0;

  for (let index = 1; index < path.length; index += 1) {
    const a = path[index - 1];
    const b = path[index];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSquared = dx * dx + dy * dy || 1;
    const t = clamp(
      ((target.x - a.x) * dx + (target.y - a.y) * dy) /
        lengthSquared,
    );
    const nearestX = a.x + dx * t;
    const nearestY = a.y + dy * t;
    const distance = Math.hypot(
      target.x - nearestX,
      target.y - nearestY,
    );
    if (distance < bestDistance) {
      bestDistance = distance;
      bestSide = dx * (target.y - a.y) - dy * (target.x - a.x);
    }
  }
  return bestSide >= 0 ? 1 : 0;
}

export function isBoundaryPathValid(path: BoundaryVector[]): boolean {
  if (path.length < 8) return false;
  const xs = path.map((point) => point.x);
  const ys = path.map((point) => point.y);
  const spansHorizontal = Math.min(...xs) < 0.18 && Math.max(...xs) > 0.82;
  const spansVertical = Math.min(...ys) < 0.18 && Math.max(...ys) > 0.82;
  return spansHorizontal || spansVertical;
}

function targetForLevel(
  level: 0 | 1 | 2,
  levels: BoundaryLevelDefinition[],
): number {
  const definition = levels[level];
  if (definition?.type !== LEVEL_TYPES[level]) {
    return [0.85, 0.8, 0.75][level];
  }
  return clamp(finiteNumber(definition.target, [0.85, 0.8, 0.75][level]));
}

export function scoreBoundary(
  state: BoundaryChallengeState,
  rawPath: BoundaryVector[],
  levels: BoundaryLevelDefinition[],
  now = Date.now(),
): BoundaryScoreResult {
  const path = normalizePath(rawPath);
  if (!isBoundaryPathValid(path)) {
    return {
      valid: false,
      state: {
        ...clearBoundary(state),
        invalidPath: true,
      },
    };
  }

  let correctNormal = 0;
  state.points.forEach((point) => {
    if (boundarySide(point, path) === point.label) correctNormal += 1;
  });
  const flip = correctNormal < state.points.length / 2;
  let correct = 0;
  const points = state.points.map((point) => {
    let predicted = boundarySide(point, path);
    if (flip) predicted = predicted === 1 ? 0 : 1;
    const wrong = predicted !== point.label;
    if (!wrong) correct += 1;
    return { ...point, wrong };
  });
  const score = state.points.length > 0 ? correct / state.points.length : 0;
  const passed = score >= targetForLevel(state.level, levels);

  return {
    valid: true,
    state: {
      ...state,
      points,
      path,
      scored: true,
      passed,
      score,
      flip,
      invalidPath: false,
      pendingAdvanceAt: passed ? now + BOUNDARY_ADVANCE_DELAY_MS : null,
    },
  };
}

export function advanceBoundaryLevel(
  state: BoundaryChallengeState,
  random: RandomSource = Math.random,
): BoundaryChallengeState {
  if (!state.passed || state.completed) return state;
  if (state.level === 2) {
    return {
      ...state,
      completed: true,
      pendingAdvanceAt: null,
    };
  }
  const nextLevel = (state.level + 1) as 1 | 2;
  const generated = pointsForLevel(nextLevel, state.baseSurvey, random);
  return {
    ...state,
    level: nextLevel,
    points: generated.points,
    baseSurvey: generated.baseSurvey,
    path: [],
    scored: false,
    passed: false,
    score: null,
    flip: false,
    invalidPath: false,
    pendingAdvanceAt: null,
  };
}
