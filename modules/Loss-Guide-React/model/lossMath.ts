export interface LossSample {
  id: string;
  target: number;
  prediction: number;
}

export interface LossMetrics {
  meanSignedError: number;
  mae: number;
  mse: number;
}

export function signedError(target: number, prediction: number) {
  return prediction - target;
}

export function absoluteError(target: number, prediction: number) {
  return Math.abs(signedError(target, prediction));
}

export function squaredError(target: number, prediction: number) {
  return signedError(target, prediction) ** 2;
}

export function calculateLossMetrics(samples: LossSample[]): LossMetrics {
  if (!samples.length) {
    throw new RangeError('Loss metrics require at least one sample.');
  }

  const totals = samples.reduce(
    (current, sample) => {
      const error = signedError(sample.target, sample.prediction);
      return {
        signed: current.signed + error,
        absolute: current.absolute + Math.abs(error),
        squared: current.squared + error ** 2,
      };
    },
    { signed: 0, absolute: 0, squared: 0 },
  );

  return {
    meanSignedError: totals.signed / samples.length,
    mae: totals.absolute / samples.length,
    mse: totals.squared / samples.length,
  };
}
