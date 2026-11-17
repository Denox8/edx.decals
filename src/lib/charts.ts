/** Ports of the PHP $buildLineChart / $buildBarChart closures from admin/sales.php. */
export type SeriesPoint = { label: string; value: number };

const W = 760;
const H = 260;
const L = 24;
const R = 24;
const T = 24;

export function lineChart(series: SeriesPoint[]) {
  const bottom = 36;
  const iw = W - L - R;
  const ih = H - T - bottom;
  const count = Math.max(1, series.length);
  const max = Math.max(1, ...series.map((p) => p.value));
  const points = series.map((p, i) => ({
    x: +(L + (count === 1 ? iw / 2 : (i / (count - 1)) * iw)).toFixed(2),
    y: +(T + ih - (p.value / max) * ih).toFixed(2),
    label: p.label,
    value: p.value
  }));
  const polyline = points.map((p) => `${p.x},${p.y}`).join(" ");
  const area = `${polyline} ${L + iw},${T + ih} ${L},${T + ih}`;
  const grid = [0, 1, 2, 3, 4].map((s) => T + (ih / 4) * s);
  return { width: W, height: H, left: L, innerWidth: iw, points, polyline, area, grid };
}

export function barChart(series: SeriesPoint[]) {
  const bottom = 40;
  const iw = W - L - R;
  const ih = H - T - bottom;
  const count = Math.max(1, series.length);
  const gap = 14;
  const bw = Math.max(18, (iw - (count - 1) * gap) / count);
  const max = Math.max(1, ...series.map((p) => p.value));
  const bars = series.map((p, i) => {
    const h = (p.value / max) * ih;
    return { x: +(L + i * (bw + gap)).toFixed(2), y: +(T + ih - h).toFixed(2), width: +bw.toFixed(2), height: +h.toFixed(2), label: p.label, value: p.value };
  });
  const grid = [0, 1, 2, 3, 4].map((s) => T + (ih / 4) * s);
  return { width: W, height: H, left: L, innerWidth: iw, bars, grid };
}
