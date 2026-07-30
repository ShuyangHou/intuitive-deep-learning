import { useId, type CSSProperties, type ReactNode } from 'react';
import { RangeControl } from '../../shared/react';
import {
  CLOSE_LOSS_THRESHOLD,
  EXACT_LOSS_THRESHOLD,
  MANUAL_TARGET,
  forwardFullNetwork,
  forwardOutputWeights,
  type FullWeights,
  type OutputWeights,
} from '../model/gradientMath';

interface CommonDiagramProps {
  target: number | null;
  updating?: boolean;
  className?: string;
}

interface OutputDiagramProps extends CommonDiagramProps {
  mode: 'output';
  weights: OutputWeights;
  controls?: {
    v1: ReactNode;
    v2: ReactNode;
  };
}

interface FullDiagramProps extends CommonDiagramProps {
  mode: 'full';
  weights: FullWeights;
}

export type GradientNetworkDiagramProps =
  | OutputDiagramProps
  | FullDiagramProps;

function classNames(...names: Array<string | false | undefined>): string {
  return names.filter(Boolean).join(' ');
}

function format(value: number): string {
  return value.toFixed(2);
}

function edgeStyle(weight: number, markerId: string): CSSProperties {
  return {
    strokeWidth: 2 + Math.min(5, Math.abs(weight) * 1.3),
    opacity: 0.5 + Math.min(0.5, Math.abs(weight) / 3),
    markerEnd: `url(#${markerId})`,
  };
}

function comparison(error: number | null): {
  symbol: string;
  close: boolean;
} {
  if (error === null) return { symbol: '?', close: false };

  const loss = Math.abs(error);
  if (loss < EXACT_LOSS_THRESHOLD) return { symbol: '=', close: true };
  if (loss < CLOSE_LOSS_THRESHOLD) return { symbol: '≈', close: true };
  return { symbol: error > 0 ? '>' : '<', close: false };
}

function OutputNetworkDiagram({
  weights,
  target,
  updating,
  className,
  controls,
}: OutputDiagramProps) {
  const instanceId = useId().replace(/:/g, '');
  const markerId = `gd-output-arrow-${instanceId}`;
  const fixedMarkerId = `gd-fixed-arrow-${instanceId}`;
  const result = forwardOutputWeights(weights, target ?? MANUAL_TARGET);
  const compare = comparison(target === null ? null : result.output - target);

  return (
    <div
      className={classNames(
        'edu-canvas-frame',
        'gd-network-canvas',
        'gd-network-canvas--output',
        updating && 'is-updating',
        className,
      )}
    >
      <svg
        viewBox="0 0 1000 390"
        role="img"
        aria-label={`网络：预测值 ${format(result.output)}，目标值 ${
          target === null ? '尚未设置' : format(target)
        }`}
      >
        <defs>
          <marker
            id={fixedMarkerId}
            markerWidth="8"
            markerHeight="7"
            refX="7"
            refY="3.5"
            orient="auto"
          >
            <path d="M0,0 L8,3.5 L0,7 Z" fill="#9fb0c8" />
          </marker>
          <marker
            id={markerId}
            markerWidth="8"
            markerHeight="7"
            refX="7"
            refY="3.5"
            orient="auto"
          >
            <path d="M0,0 L8,3.5 L0,7 Z" fill="#f07e47" />
          </marker>
        </defs>

        <text className="gd-layer-label" x="100" y="42">
          输入
        </text>
        <text className="gd-layer-label" x="410" y="42">
          隐藏层
        </text>
        <text className="gd-layer-label" x="720" y="42">
          预测
        </text>
        <text className="gd-layer-label" x="910" y="42">
          真实值
        </text>

        <g className="gd-fixed-edges">
          <line
            x1="134"
            y1="130"
            x2="374"
            y2="135"
            style={{ markerEnd: `url(#${fixedMarkerId})` }}
          />
          <line
            x1="134"
            y1="130"
            x2="374"
            y2="270"
            style={{ markerEnd: `url(#${fixedMarkerId})` }}
          />
          <line
            x1="134"
            y1="275"
            x2="374"
            y2="135"
            style={{ markerEnd: `url(#${fixedMarkerId})` }}
          />
          <line
            x1="134"
            y1="275"
            x2="374"
            y2="270"
            style={{ markerEnd: `url(#${fixedMarkerId})` }}
          />
          <text x="245" y="119">
            w₁₁ = 1
          </text>
          <text x="260" y="188">
            w₂₁ = 1
          </text>
          <text x="255" y="251">
            w₁₂ = 1
          </text>
          <text x="245" y="296">
            w₂₂ = 0
          </text>
        </g>

        <g className="gd-output-edges">
          <line
            x1="446"
            y1="135"
            x2="680"
            y2="202"
            style={edgeStyle(weights.v1, markerId)}
          />
          <line
            x1="446"
            y1="270"
            x2="680"
            y2="212"
            style={edgeStyle(weights.v2, markerId)}
          />
        </g>

        <foreignObject x="485" y="106" width="178" height="82">
          {controls?.v1 ?? (
            <RangeControl
              label="v₁"
              controlClassName="gd-inline-weight"
              min={-1}
              max={3}
              step={0.1}
              digits={1}
              value={weights.v1}
              disabled
              aria-label="输出层权重 v₁（只读）"
            />
          )}
        </foreignObject>
        <foreignObject x="485" y="226" width="178" height="82">
          {controls?.v2 ?? (
            <RangeControl
              label="v₂"
              controlClassName="gd-inline-weight"
              min={-1}
              max={3}
              step={0.1}
              digits={1}
              value={weights.v2}
              disabled
              aria-label="输出层权重 v₂（只读）"
            />
          )}
        </foreignObject>

        <g className="gd-node gd-node--input" transform="translate(100 130)">
          <circle r="35" />
          <text y="-5">x₁</text>
          <text className="gd-node-value" y="18">
            1
          </text>
        </g>
        <g className="gd-node gd-node--input" transform="translate(100 275)">
          <circle r="35" />
          <text y="-5">x₂</text>
          <text className="gd-node-value" y="18">
            2
          </text>
        </g>
        <g className="gd-node gd-node--hidden" transform="translate(410 135)">
          <circle r="36" />
          <text y="-5">h₁</text>
          <text className="gd-node-value" y="18">
            3
          </text>
        </g>
        <g className="gd-node gd-node--hidden" transform="translate(410 270)">
          <circle r="36" />
          <text y="-5">h₂</text>
          <text className="gd-node-value" y="18">
            1
          </text>
        </g>
        <g
          className={classNames(
            'gd-node',
            'gd-node--output',
            compare.close && 'is-close',
          )}
          transform="translate(720 207)"
        >
          <circle r="40" />
          <text y="-7">预测 y</text>
          <text className="gd-node-value" y="19">
            {format(result.output)}
          </text>
        </g>
        <text
          className={classNames(
            'gd-compare-symbol',
            compare.close && 'is-equal',
          )}
          x="814"
          y="217"
        >
          {compare.symbol}
        </text>
        <g className="gd-node gd-node--target" transform="translate(910 207)">
          <circle r="40" />
          <text y="-7">真实 GT</text>
          <text className="gd-node-value" y="19">
            {target === null ? '—' : format(target)}
          </text>
        </g>
      </svg>
    </div>
  );
}

function FullNetworkDiagram({
  weights,
  target,
  updating,
  className,
}: FullDiagramProps) {
  const markerId = `gd-full-arrow-${useId().replace(/:/g, '')}`;
  const result = forwardFullNetwork(weights, target);
  const compare = comparison(result.error);

  return (
    <div
      className={classNames(
        'edu-canvas-frame',
        'gd-network-canvas',
        'gd-full-network',
        updating && 'is-backprop',
        className,
      )}
    >
      <svg
        viewBox="0 0 900 330"
        role="img"
        aria-label={`全部参数可更新的两层网络：预测值 ${format(
          result.output,
        )}，目标值 ${target === null ? '尚未设置' : format(target)}`}
      >
        <defs>
          <marker
            id={markerId}
            markerWidth="8"
            markerHeight="7"
            refX="7"
            refY="3.5"
            orient="auto"
          >
            <path d="M0,0 L8,3.5 L0,7 Z" fill="#f07e47" />
          </marker>
        </defs>

        <text className="gd-layer-label" x="90" y="34">
          输入
        </text>
        <text className="gd-layer-label" x="390" y="34">
          隐藏层
        </text>
        <text className="gd-layer-label" x="670" y="34">
          预测
        </text>
        <text className="gd-layer-label" x="820" y="34">
          真实值
        </text>

        <g className="gd-full-edges">
          <line
            x1="125"
            y1="105"
            x2="354"
            y2="105"
            style={edgeStyle(weights.w11, markerId)}
          />
          <line
            x1="125"
            y1="105"
            x2="354"
            y2="235"
            style={edgeStyle(weights.w12, markerId)}
          />
          <line
            x1="125"
            y1="235"
            x2="354"
            y2="105"
            style={edgeStyle(weights.w21, markerId)}
          />
          <line
            x1="125"
            y1="235"
            x2="354"
            y2="235"
            style={edgeStyle(weights.w22, markerId)}
          />
          <line
            x1="426"
            y1="105"
            x2="632"
            y2="168"
            style={edgeStyle(weights.v1, markerId)}
          />
          <line
            x1="426"
            y1="235"
            x2="632"
            y2="182"
            style={edgeStyle(weights.v2, markerId)}
          />
        </g>

        <g className="gd-full-weight-labels" aria-hidden="true">
          <text x="235" y="94">
            w₁₁ = {format(weights.w11)}
          </text>
          <text x="270" y="205">
            w₁₂ = {format(weights.w12)}
          </text>
          <text x="270" y="143">
            w₂₁ = {format(weights.w21)}
          </text>
          <text x="235" y="257">
            w₂₂ = {format(weights.w22)}
          </text>
          <text x="520" y="119">
            v₁ = {format(weights.v1)}
          </text>
          <text x="520" y="238">
            v₂ = {format(weights.v2)}
          </text>
        </g>

        <g className="gd-node gd-node--input" transform="translate(90 105)">
          <circle r="34" />
          <text y="-5">x₁</text>
          <text className="gd-node-value" y="18">
            1
          </text>
        </g>
        <g className="gd-node gd-node--input" transform="translate(90 235)">
          <circle r="34" />
          <text y="-5">x₂</text>
          <text className="gd-node-value" y="18">
            2
          </text>
        </g>
        <g className="gd-node gd-node--hidden" transform="translate(390 105)">
          <circle r="36" />
          <text y="-5">h₁</text>
          <text className="gd-node-value" y="18">
            {format(result.h1)}
          </text>
        </g>
        <g className="gd-node gd-node--hidden" transform="translate(390 235)">
          <circle r="36" />
          <text y="-5">h₂</text>
          <text className="gd-node-value" y="18">
            {format(result.h2)}
          </text>
        </g>
        <g
          className={classNames(
            'gd-node',
            'gd-node--output',
            compare.close && 'is-close',
          )}
          transform="translate(670 175)"
        >
          <circle r="40" />
          <text y="-7">预测 y</text>
          <text className="gd-node-value" y="19">
            {format(result.output)}
          </text>
        </g>
        <text
          className={classNames(
            'gd-compare-symbol',
            compare.close && 'is-equal',
          )}
          x="748"
          y="185"
        >
          {compare.symbol}
        </text>
        <g className="gd-node gd-node--target" transform="translate(820 175)">
          <circle r="40" />
          <text y="-7">真实 GT</text>
          <text className="gd-node-value" y="19">
            {target === null ? '—' : format(target)}
          </text>
        </g>
      </svg>
    </div>
  );
}

export function GradientNetworkDiagram(
  props: GradientNetworkDiagramProps,
) {
  return props.mode === 'output' ? (
    <OutputNetworkDiagram {...props} />
  ) : (
    <FullNetworkDiagram {...props} />
  );
}
