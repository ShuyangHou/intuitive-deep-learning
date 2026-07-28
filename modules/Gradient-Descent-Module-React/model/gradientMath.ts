export const MANUAL_TARGET = 10;
export const EXACT_LOSS_THRESHOLD = 0.005;
export const CLOSE_LOSS_THRESHOLD = 0.5;

const INPUT_X1 = 1;
const INPUT_X2 = 2;
const MANUAL_H1 = 3;
const MANUAL_H2 = 1;

export interface OutputWeights {
  v1: number;
  v2: number;
}

export interface FullWeights extends OutputWeights {
  w11: number;
  w21: number;
  w12: number;
  w22: number;
}

export const INITIAL_OUTPUT_WEIGHTS: Readonly<OutputWeights> = Object.freeze({
  v1: -1,
  v2: -1,
});

export const INITIAL_FULL_WEIGHTS: Readonly<FullWeights> = Object.freeze({
  w11: 1,
  w21: 1,
  w12: 1,
  w22: 0,
  v1: 1,
  v2: 1,
});

export interface OutputForwardResult {
  output: number;
  error: number;
  loss: number;
}

export interface OutputWeightStep {
  weights: OutputWeights;
  before: OutputForwardResult;
  after: OutputForwardResult;
  gradients: OutputWeights;
  deltas: OutputWeights;
  stepRatio: number;
  didUpdate: boolean;
}

export interface FullForwardResult {
  h1: number;
  h2: number;
  output: number;
  error: number | null;
  loss: number | null;
}

export interface FullWeightStep {
  weights: FullWeights;
  before: FullForwardResult;
  after: FullForwardResult;
  gradients: FullWeights;
  rate: number;
  nextRate: number;
  decay: number;
  didUpdate: boolean;
}

export interface LearningSchedule {
  loss: number;
  rate: number;
  decay: number;
}

/**
 * Forward pass for the first two activities. The hidden layer is deliberately
 * frozen at h₁ = 3 and h₂ = 1, matching the original teaching module.
 */
export function forwardOutputWeights(
  weights: Readonly<OutputWeights>,
  target = MANUAL_TARGET,
): OutputForwardResult {
  const output = weights.v1 * MANUAL_H1 + weights.v2 * MANUAL_H2;
  const error = output - target;

  return {
    output,
    error,
    loss: Math.abs(error),
  };
}

/**
 * Applies one L1-loss gradient step to the two output weights.
 *
 * The original module uses a "step ratio" rather than a conventional learning
 * rate in this activity:
 *   vᵢ(new) = vᵢ(old) - sign(y - GT) × hᵢ × stepRatio
 */
export function stepOutputWeights(
  weights: Readonly<OutputWeights>,
  stepRatio: number,
  target = MANUAL_TARGET,
): OutputWeightStep {
  const before = forwardOutputWeights(weights, target);

  if (before.loss < EXACT_LOSS_THRESHOLD) {
    const unchanged = { ...weights };
    const zeros: OutputWeights = { v1: 0, v2: 0 };

    return {
      weights: unchanged,
      before,
      after: before,
      gradients: zeros,
      deltas: { ...zeros },
      stepRatio,
      didUpdate: false,
    };
  }

  const signal = Math.sign(before.error);
  const gradients: OutputWeights = {
    v1: signal * MANUAL_H1,
    v2: signal * MANUAL_H2,
  };
  const deltas: OutputWeights = {
    v1: -gradients.v1 * stepRatio,
    v2: -gradients.v2 * stepRatio,
  };
  const nextWeights: OutputWeights = {
    v1: weights.v1 + deltas.v1,
    v2: weights.v2 + deltas.v2,
  };

  return {
    weights: nextWeights,
    before,
    after: forwardOutputWeights(nextWeights, target),
    gradients,
    deltas,
    stepRatio,
    didUpdate: true,
  };
}

/**
 * Forward pass for the final activity. Inputs remain fixed at x₁ = 1, x₂ = 2;
 * all six weights are trainable.
 */
export function forwardFullNetwork(
  weights: Readonly<FullWeights>,
  target: number | null,
): FullForwardResult {
  const h1 = weights.w11 * INPUT_X1 + weights.w21 * INPUT_X2;
  const h2 = weights.w12 * INPUT_X1 + weights.w22 * INPUT_X2;
  const output = weights.v1 * h1 + weights.v2 * h2;
  const error = target === null ? null : output - target;

  return {
    h1,
    h2,
    output,
    error,
    loss: error === null ? null : Math.abs(error),
  };
}

/**
 * Applies one simultaneous six-weight update and returns the decayed rate for
 * the next turn. As in the original UI, a network already within 0.5 of the
 * target is left unchanged.
 */
export function stepFullNetwork(
  weights: Readonly<FullWeights>,
  target: number,
  rate: number,
  decay = 1,
): FullWeightStep {
  const before = forwardFullNetwork(weights, target);

  if (before.loss !== null && before.loss < CLOSE_LOSS_THRESHOLD) {
    const unchanged = { ...weights };
    const zeros: FullWeights = {
      w11: 0,
      w21: 0,
      w12: 0,
      w22: 0,
      v1: 0,
      v2: 0,
    };

    return {
      weights: unchanged,
      before,
      after: before,
      gradients: zeros,
      rate,
      nextRate: rate,
      decay,
      didUpdate: false,
    };
  }

  // trainFullNetworkOnce uses `output > target ? 1 : -1`. Equality cannot
  // reach this branch because it has zero loss and is handled above.
  const signal = before.output > target ? 1 : -1;
  const gradients: FullWeights = {
    v1: signal * before.h1,
    v2: signal * before.h2,
    w11: signal * weights.v1 * INPUT_X1,
    w21: signal * weights.v1 * INPUT_X2,
    w12: signal * weights.v2 * INPUT_X1,
    w22: signal * weights.v2 * INPUT_X2,
  };
  const nextWeights: FullWeights = {
    w11: weights.w11 - rate * gradients.w11,
    w21: weights.w21 - rate * gradients.w21,
    w12: weights.w12 - rate * gradients.w12,
    w22: weights.w22 - rate * gradients.w22,
    v1: weights.v1 - rate * gradients.v1,
    v2: weights.v2 - rate * gradients.v2,
  };

  return {
    weights: nextWeights,
    before,
    after: forwardFullNetwork(nextWeights, target),
    gradients,
    rate,
    nextRate: rate * decay,
    decay,
    didUpdate: true,
  };
}

function simulateFullTraining(
  target: number,
  rate: number,
  decay: number,
  maxSteps: number,
): number {
  let weights: FullWeights = { ...INITIAL_FULL_WEIGHTS };
  let currentRate = rate;
  let result = forwardFullNetwork(weights, target);

  for (
    let step = 0;
    step < maxSteps && result.loss !== null && result.loss >= CLOSE_LOSS_THRESHOLD;
    step += 1
  ) {
    const update = stepFullNetwork(weights, target, currentRate, decay);
    weights = update.weights;
    currentRate = update.nextRate;
    result = update.after;
  }

  return result.loss ?? Number.POSITIVE_INFINITY;
}

/**
 * Brute-force schedule search preserved from chooseFullLearningSchedule().
 * Each candidate receives at most six full-network updates.
 */
export function searchLearningSchedule(target: number): LearningSchedule {
  let best: LearningSchedule = {
    loss: Number.POSITIVE_INFINITY,
    rate: 0.1,
    decay: 0.5,
  };
  const rates: number[] = [];
  const decays = [0.45, 0.52, 0.6, 0.68, 0.75, 0.82, 0.9];

  for (let exponent = -3; exponent <= 0.15; exponent += 0.12) {
    rates.push(10 ** exponent);
  }
  rates.push(0.05, 0.1, 0.2, 0.35, 0.55, 0.8, 1.1, 1.5);

  rates.forEach((rate) => {
    decays.forEach((decay) => {
      const loss = simulateFullTraining(target, rate, decay, 6);
      if (loss < best.loss) {
        best = { loss, rate, decay };
      }
    });
  });

  return best;
}
