const CLASSIFICATION_SCENARIO_ENDPOINT =
  'http://127.0.0.1:59414/classification/scenario';

type UnknownRecord = Record<string, unknown>;

const SERVICE_ERROR_MESSAGES: Record<string, string> = {
  MODEL_RESPONSE_FORMAT_ERROR: '分析结果格式异常，请重新提交。',
  INVALID_JSON: '分析服务返回了无法识别的数据，请稍后再试。',
  INVALID_REQUEST_BODY: '提交内容格式不正确，请刷新页面后重试。',
  INVALID_REQUEST: '提交内容不完整，请检查后重试。',
  REQUEST_BODY_TOO_LARGE: '提交内容过长，请精简后重试。',
  AI_CONFIGURATION_ERROR: '分析服务尚未配置完成，请联系管理员。',
  AI_QUOTA_EXHAUSTED: '分析服务额度已用完，请联系管理员后再试。',
  AI_RATE_LIMITED: '提交过于频繁，请稍后再试。',
  AI_AUTHENTICATION_FAILED: '分析服务认证失败，请联系管理员。',
  AI_REQUEST_TIMEOUT: '分析超时，请稍后再试。',
  AI_NETWORK_ERROR: '暂时无法连接分析服务，请稍后再试。',
  AI_INVALID_RESPONSE: '分析服务返回了异常结果，请稍后再试。',
  AI_EMPTY_RESPONSE: '分析服务没有返回内容，请稍后再试。',
  AI_SERVICE_UNAVAILABLE: '分析服务暂时不可用，请稍后再试。',
  INTERNAL_ERROR: '分析过程出现异常，请稍后再试。',
  NOT_FOUND: '当前分析功能暂不可用，请联系管理员。',
};

function asRecord(value: unknown): UnknownRecord {
  return typeof value === 'object' && value !== null
    ? value as UnknownRecord
    : {};
}

function serviceErrorMessage(payload: UnknownRecord): string {
  const warning = asRecord(payload.warning);
  const code = String(payload.errorCode ?? warning.code ?? '').trim();
  return SERVICE_ERROR_MESSAGES[code] ?? '分析服务暂时不可用，请稍后再试。';
}

export class ClassificationScenarioServiceError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly userFacing = true;

  constructor(payload: UnknownRecord, fallback?: string) {
    const warning = asRecord(payload.warning);
    super(fallback || serviceErrorMessage(payload));
    this.name = 'ClassificationScenarioServiceError';
    this.code = String(
      payload.errorCode ?? warning.code ?? 'SERVICE_UNAVAILABLE',
    );
    this.retryable = payload.retryable !== false;
  }
}

export function classificationScenarioErrorMessage(error: unknown): string {
  if (error instanceof ClassificationScenarioServiceError) {
    return error.message;
  }
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string' &&
    SERVICE_ERROR_MESSAGES[error.code]
  ) {
    return SERVICE_ERROR_MESSAGES[error.code];
  }
  return '暂时无法连接分析服务，请稍后再试。';
}

/**
 * 调用旧模块使用的真实分类情境服务。不会生成本地“成功”回退。
 */
export async function requestClassificationScenario(
  subject: string,
  signal?: AbortSignal,
): Promise<UnknownRecord> {
  let response: Response;
  try {
    response = await fetch(CLASSIFICATION_SCENARIO_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject }),
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }
    throw new ClassificationScenarioServiceError({
      errorCode: 'AI_NETWORK_ERROR',
    });
  }

  const payload = asRecord(await response.json().catch(() => null));
  if (!response.ok || payload.ok !== true) {
    if (response.ok && Object.keys(payload).length === 0) {
      throw new ClassificationScenarioServiceError({
        errorCode: 'AI_INVALID_RESPONSE',
      });
    }
    throw new ClassificationScenarioServiceError(payload);
  }
  if (payload.structured === false) {
    throw new ClassificationScenarioServiceError(
      {
        warning: asRecord(payload.warning).code
          ? payload.warning
          : { code: 'MODEL_RESPONSE_FORMAT_ERROR' },
      },
      '分析结果格式异常，请重新提交。',
    );
  }
  const result = asRecord(payload.result);
  if (Object.keys(result).length === 0) {
    throw new ClassificationScenarioServiceError(
      { errorCode: 'AI_INVALID_RESPONSE' },
      '分析服务返回了异常结果，请稍后再试。',
    );
  }
  return result;
}
