import type { ConnectionLineComponent } from '@xyflow/react';

export const ConnectionLine: ConnectionLineComponent = ({
  fromX,
  fromY,
  toX,
  toY,
}) => (
  <g>
    <defs>
      <filter id="edgeGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="rgba(16,185,129,0.6)" />
      </filter>
    </defs>
    <path
      fill="none"
      stroke="hsl(var(--primary))"
      strokeWidth={2}
      filter="url(#edgeGlow)"
      className="animated"
      d={`M${fromX},${fromY} C ${fromX + (toX - fromX) * 0.5},${fromY} ${fromX + (toX - fromX) * 0.5},${toY} ${toX},${toY}`}
    />
    <circle
      cx={toX}
      cy={toY}
      fill="#fff"
      r={4}
      stroke="hsl(var(--primary))"
      strokeWidth={2}
    />
  </g>
);
