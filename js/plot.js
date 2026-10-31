// Shared plot helpers around Plotly. OWNER: Menna. Already working; read it so you can explain it.

// n evenly spaced values from a to b, both ends included.
export function linspace(a, b, n) {
  const out = new Array(n);
  for (let i = 0; i < n; i++) out[i] = a + ((b - a) * i) / (n - 1);
  return out;
}

// n values spaced evenly on a log scale, from a to b.
export function logspace(a, b, n) {
  return linspace(Math.log10(a), Math.log10(b), n).map(v => Math.pow(10, v));
}

export function line(x, y, name, extra = {}) {
  return { x, y, name, mode: 'lines', type: 'scatter', ...extra };
}

export function dots(x, y, name, extra = {}) {
  return { x, y, name, mode: 'markers', type: 'scatter', marker: { size: 9 }, ...extra };
}

// A dashed vertical line, drawn as a trace so it also works on log axes.
export function vline(x, yMin, yMax, name) {
  return line([x, x], [yMin, yMax], name, { line: { dash: 'dash', color: '#7f8c8d' } });
}

// Draws or redraws a plot. Plotly.react keeps slider dragging smooth.
export function draw(element, traces, layout = {}) {
  const base = {
    margin: { t: 34, r: 12, b: 46, l: 58 },
    legend: { orientation: 'h', y: 1.16 },
    font: { size: 12 },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
  };
  Plotly.react(element, traces, { ...base, ...layout }, { responsive: true, displayModeBar: false });
}
