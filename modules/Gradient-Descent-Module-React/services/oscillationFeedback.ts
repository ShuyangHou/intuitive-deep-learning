import type { ShortAnswerReview } from '../../shared/react/learning/Question';

const OSCILLATION_FEEDBACK_ENDPOINT = 'http://127.0.0.1:59414/gradient/oscillation-feedback';

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null
    ? value as Record<string, unknown>
    : null;
}

function errorMessage(body: Record<string, unknown> | null): string {
  if (typeof body?.error === 'string' && body.error.trim()) return body.error;
  return '评阅服务暂时不可用';
}

/**
 * 调用旧模块已经使用的真实震荡简答评阅接口。
 *
 * HTTP/网络错误会继续抛给模块内的私有题目适配层；适配层会显示明确的失败反馈，
 * 并按旧流程放行“去试试吧”，但不会把失败伪装成答对。
 */
export async function reviewOscillationAnswer(answer: string): Promise<ShortAnswerReview> {
  const response = await fetch(OSCILLATION_FEEDBACK_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answer }),
  });
  const body = asRecord(await response.json().catch(() => null));

  if (!response.ok || body?.ok !== true) {
    throw new Error(errorMessage(body));
  }

  const result = asRecord(body.result);
  if (result) {
    const explanation = typeof result.explanation === 'string' && result.explanation.trim()
      ? result.explanation
      : '评阅已完成，但服务没有返回可展示的解释。';
    const correct = result.is_correct === true || result.level === 'correct';
    const close = result.level === 'close' || result.verdict === '接近正确';

    return {
      ok: correct,
      tone: correct ? 'correct' : close ? 'hint' : 'wrong',
      message: explanation,
    };
  }

  const rawText = typeof body.rawText === 'string' ? body.rawText.trim() : '';
  return {
    ok: false,
    tone: 'hint',
    message: rawText || '评阅服务返回了无法确认正误的结果；你仍可以进入学习率实验。',
  };
}
