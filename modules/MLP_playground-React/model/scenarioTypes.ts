export type BoundaryLevelType = 'easy' | 'woven' | 'xor';

export interface ClassificationScenario {
  subject: string;
  normalizedSubject: string;
  taskQuestion: string;
  positiveLabel: string;
  negativeLabel: string;
  xAxis: string;
  yAxis: string;
  boundaryNote: string;
}

export interface BoundaryLevelDefinition {
  name: string;
  description: string;
  target: number;
  type: BoundaryLevelType;
}

export interface ParsedClassificationScenario {
  scenario: ClassificationScenario;
  introLines: string[];
  levels: BoundaryLevelDefinition[];
}

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return typeof value === 'object' && value !== null
    ? value as UnknownRecord
    : {};
}

function textValue(value: unknown, fallback: string): string {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function boundedText(value: unknown, fallback: string, maxLength = 180): string {
  return textValue(value, fallback).slice(0, maxLength);
}

export function createDefaultClassificationScenario(): ClassificationScenario {
  return {
    subject: '网球',
    normalizedSubject: '网球',
    taskQuestion: '能不能判断一个人是否喜欢网球？',
    positiveLabel: '喜欢网球',
    negativeLabel: '不喜欢网球',
    xAxis: '接触频率',
    yAxis: '兴趣强度',
    boundaryNote:
      '下面这张图可以理解为一次关于网球兴趣的调研：横轴是接触频率，纵轴是兴趣强度。你画出的线，就是一个人工设计的判断规则。',
  };
}

export function createDefaultBoundaryLevels(
  scenario: ClassificationScenario = createDefaultClassificationScenario(),
): BoundaryLevelDefinition[] {
  return [
    {
      name: `第一关 · ${scenario.normalizedSubject}兴趣调研`,
      description:
        `第一关：每个点是一位学习者，位置由${scenario.xAxis}和${scenario.yAxis}决定。` +
        `红点表示${scenario.positiveLabel}，蓝点表示${scenario.negativeLabel}。`,
      target: 0.85,
      type: 'easy',
    },
    {
      name: '第二关 · 噪声样本浮现',
      description:
        '第二关：刚才那批数据还在，但现在又出现了一些边界更模糊的样本。请在新的散点分布上重新画一次边界。',
      target: 0.8,
      type: 'woven',
    },
    {
      name: '第三关 · 非线性结构',
      description:
        '第三关：同一类评价出现在对角区域，单条简单边界已经很吃力。这正是 MLP 要处理的问题。',
      target: 0.75,
      type: 'xor',
    },
  ];
}

export function normalizeClassificationScenario(value: unknown): ClassificationScenario {
  const fallback = createDefaultClassificationScenario();
  const candidate = asRecord(value);
  const subject = boundedText(candidate.subject, fallback.subject, 80);
  const normalizedSubject = boundedText(
    candidate.normalizedSubject,
    subject,
    80,
  );
  const xAxis = boundedText(candidate.xAxis, fallback.xAxis, 60);
  const yAxis = boundedText(candidate.yAxis, fallback.yAxis, 60);

  return {
    subject,
    normalizedSubject,
    taskQuestion: boundedText(
      candidate.taskQuestion,
      '能不能判断样本是否属于正类？',
    ),
    positiveLabel: boundedText(candidate.positiveLabel, '正类', 60),
    negativeLabel: boundedText(candidate.negativeLabel, '负类', 60),
    xAxis,
    yAxis,
    boundaryNote: boundedText(
      candidate.boundaryNote,
      `下面这张图可以理解为一次关于“${normalizedSubject}”的调研：横轴是${xAxis}，纵轴是${yAxis}。你画出的线，就是一个人工设计的判断规则。`,
      360,
    ),
  };
}

export function normalizeBoundaryLevels(
  value: unknown,
  scenario: ClassificationScenario,
): BoundaryLevelDefinition[] {
  const defaults = createDefaultBoundaryLevels(scenario);
  if (!Array.isArray(value)) return defaults;

  return defaults.map((fallback, index) => {
    const candidate = asRecord(value[index]);
    return {
      ...fallback,
      name: boundedText(candidate.name, fallback.name, 100),
      description: boundedText(
        candidate.description,
        fallback.description,
        360,
      ),
    };
  });
}

/**
 * 将 59414 的 snake_case / camelCase 两种响应统一成模块内部模型。
 * 阈值和关卡类型仍由课程定义固定，服务只能生成课程文案。
 */
export function parseClassificationScenario(
  rawResult: unknown,
  rawSubject: string,
): ParsedClassificationScenario {
  const result = asRecord(rawResult);
  const subject = textValue(rawSubject, '网球').slice(0, 80);
  const featureX = asRecord(result.feature_x ?? result.featureX);
  const featureY = asRecord(result.feature_y ?? result.featureY);
  const normalizedSubject = boundedText(
    result.normalized_subject ?? result.normalizedSubject,
    subject,
    80,
  );
  const xAxis = boundedText(
    featureX.axis_label ?? featureX.axisLabel ?? featureX.name,
    '特征 A',
    60,
  );
  const yAxis = boundedText(
    featureY.axis_label ?? featureY.axisLabel ?? featureY.name,
    '特征 B',
    60,
  );
  const positiveLabel = boundedText(
    result.positive_label ?? result.positiveLabel,
    '正类',
    60,
  );
  const negativeLabel = boundedText(
    result.negative_label ?? result.negativeLabel,
    '负类',
    60,
  );
  const scenario = normalizeClassificationScenario({
    subject,
    normalizedSubject,
    taskQuestion: boundedText(
      result.task_question ?? result.taskQuestion,
      '能不能判断样本是否属于正类？',
    ),
    positiveLabel,
    negativeLabel,
    xAxis,
    yAxis,
    boundaryNote: boundedText(
      result.boundary_note ?? result.boundaryNote,
      `下面这张图可以理解为一次关于“${normalizedSubject}”的调研：横轴是${xAxis}，纵轴是${yAxis}。你画出的线，就是一个人工设计的判断规则。`,
      360,
    ),
  });

  const levels = createDefaultBoundaryLevels(scenario);
  levels[0] = {
    ...levels[0],
    name: boundedText(
      result.first_level_name ?? result.firstLevelName,
      `第一关 · ${scenario.normalizedSubject}分类调研`,
      100,
    ),
    description: boundedText(
      result.first_level_description ?? result.firstLevelDescription,
      `第一关：每个点都是一个样本，位置由${scenario.xAxis}和${scenario.yAxis}决定。` +
        `红点表示${scenario.positiveLabel}，蓝点表示${scenario.negativeLabel}。`,
      360,
    ),
  };
  levels[1] = {
    ...levels[1],
    description: boundedText(
      result.second_level_description ?? result.secondLevelDescription,
      '第二关：刚才那批数据还在，但现在又出现了一些更接近真实情况的模糊样本。请在新的散点分布上重新画一次边界。',
      360,
    ),
  };
  levels[2] = {
    ...levels[2],
    description: boundedText(
      result.third_level_description ?? result.thirdLevelDescription,
      '第三关：同一类样本出现在对角区域，单条简单边界已经很吃力。这正是 MLP 要处理的问题。',
      360,
    ),
  };

  const rawLines = result.intro_lines ?? result.introLines;
  const serviceLines = Array.isArray(rawLines)
    ? rawLines
        .map((line) => String(line ?? '').trim())
        .filter(Boolean)
        .map((line) => line.slice(0, 360))
    : [];
  const introLines = serviceLines.length >= 4
    ? serviceLines.slice(0, 4)
    : [
        `你写的是“${subject}”。我会围绕它生成一个二分类问题。`,
        `现在问题变成：${scenario.taskQuestion}`,
        `先取两个可量化特征：${scenario.xAxis}，以及${scenario.yAxis}。`,
        '能画出一条边界分开两类点，就是分类模型要学习的事。',
      ];

  return { scenario, introLines, levels };
}
