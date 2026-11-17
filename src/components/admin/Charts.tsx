import { barChart, lineChart, type SeriesPoint } from "@/lib/charts";

export function LineChart({ series, label }: { series: SeriesPoint[]; label: string }) {
  const c = lineChart(series);
  return (
    <div className="chart-shell">
      <svg className="chart-svg" viewBox={`0 0 ${c.width} ${c.height}`} role="img" aria-label={label}>
        <defs>
          <linearGradient id="edx-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.45" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {c.grid.map((y) => (
          <line key={y} className="chart-grid" x1={c.left} y1={y} x2={c.left + c.innerWidth} y2={y} />
        ))}
        <polygon points={c.area} fill="url(#edx-area)" />
        <polyline className="chart-line" points={c.polyline} />
        {c.points.map((p) => (
          <circle key={p.label} className="chart-point" cx={p.x} cy={p.y} r={4.5}>
            <title>{`${p.label}: ${p.value.toFixed(2)}`}</title>
          </circle>
        ))}
      </svg>
      <div className="chart-labels" aria-hidden="true">
        {c.points.map((p, i) => (
          <span key={p.label}>{i % 2 === 0 ? p.label : ""}</span>
        ))}
      </div>
    </div>
  );
}

export function BarChart({ series, label }: { series: SeriesPoint[]; label: string }) {
  const c = barChart(series);
  return (
    <div className="chart-shell">
      <svg className="chart-svg" viewBox={`0 0 ${c.width} ${c.height}`} role="img" aria-label={label}>
        {c.grid.map((y) => (
          <line key={y} className="chart-grid" x1={c.left} y1={y} x2={c.left + c.innerWidth} y2={y} />
        ))}
        {c.bars.map((b) => (
          <rect key={b.label} className="chart-bar" x={b.x} y={b.y} width={b.width} height={b.height}>
            <title>{`${b.label}: ${b.value}`}</title>
          </rect>
        ))}
      </svg>
      <div className="chart-labels" aria-hidden="true">
        {c.bars.map((b) => (
          <span key={b.label}>{b.label}</span>
        ))}
      </div>
    </div>
  );
}
