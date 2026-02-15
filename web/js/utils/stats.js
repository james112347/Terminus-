// Terminus PWA - Statistical Utilities

// Mean of array
export function mean(arr) {
  if (!arr.length) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

// Standard deviation
export function stdDev(arr) {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const variance = arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

// Pearson correlation coefficient
export function pearsonCorrelation(x, y) {
  if (x.length !== y.length || x.length < 3) return 0;
  const n = x.length;
  const mx = mean(x);
  const my = mean(y);
  let num = 0, dx2 = 0, dy2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - mx;
    const dy = y[i] - my;
    num += dx * dy;
    dx2 += dx * dx;
    dy2 += dy * dy;
  }
  const den = Math.sqrt(dx2 * dy2);
  return den === 0 ? 0 : num / den;
}

// Simple moving average
export function movingAverage(arr, window = 7) {
  const result = [];
  for (let i = 0; i < arr.length; i++) {
    const start = Math.max(0, i - window + 1);
    const slice = arr.slice(start, i + 1);
    result.push(mean(slice));
  }
  return result;
}

// Linear regression: returns { slope, intercept, r2 }
export function linearRegression(x, y) {
  if (x.length !== y.length || x.length < 2) return { slope: 0, intercept: 0, r2: 0 };
  const n = x.length;
  const mx = mean(x);
  const my = mean(y);
  let ssxy = 0, ssxx = 0, ssyy = 0;
  for (let i = 0; i < n; i++) {
    ssxy += (x[i] - mx) * (y[i] - my);
    ssxx += (x[i] - mx) ** 2;
    ssyy += (y[i] - my) ** 2;
  }
  const slope = ssxx === 0 ? 0 : ssxy / ssxx;
  const intercept = my - slope * mx;
  const r2 = ssyy === 0 ? 0 : (ssxy ** 2) / (ssxx * ssyy);
  return { slope, intercept, r2 };
}

// Cubic spline interpolation for smooth energy curves
export function cubicSpline(points) {
  // points: [{x, y}, ...] sorted by x
  if (points.length < 2) return () => points[0]?.y || 0;
  const n = points.length - 1;
  const h = [], alpha = [], l = [1], mu = [0], z = [0];
  const c = new Array(n + 1).fill(0);
  const b = new Array(n).fill(0);
  const d = new Array(n).fill(0);

  for (let i = 0; i < n; i++) h[i] = points[i + 1].x - points[i].x;
  for (let i = 1; i < n; i++) {
    alpha[i] = (3 / h[i]) * (points[i + 1].y - points[i].y) -
               (3 / h[i - 1]) * (points[i].y - points[i - 1].y);
  }
  for (let i = 1; i < n; i++) {
    l[i] = 2 * (points[i + 1].x - points[i - 1].x) - h[i - 1] * mu[i - 1];
    mu[i] = h[i] / l[i];
    z[i] = (alpha[i] - h[i - 1] * z[i - 1]) / l[i];
  }
  l[n] = 1; z[n] = 0;
  for (let j = n - 1; j >= 0; j--) {
    c[j] = z[j] - mu[j] * c[j + 1];
    b[j] = (points[j + 1].y - points[j].y) / h[j] - h[j] * (c[j + 1] + 2 * c[j]) / 3;
    d[j] = (c[j + 1] - c[j]) / (3 * h[j]);
  }

  return function(x) {
    if (x <= points[0].x) return points[0].y;
    if (x >= points[n].x) return points[n].y;
    let i = 0;
    while (i < n && points[i + 1].x < x) i++;
    const dx = x - points[i].x;
    return points[i].y + b[i] * dx + c[i] * dx ** 2 + d[i] * dx ** 3;
  };
}

// Detect recurring patterns in time series
export function detectPatterns(data, minOccurrences = 3) {
  // data: [{dayOfWeek, hour, value}, ...]
  const buckets = {};
  data.forEach(d => {
    const key = `${d.dayOfWeek}-${d.hour}`;
    if (!buckets[key]) buckets[key] = [];
    buckets[key].push(d.value);
  });

  const patterns = [];
  for (const [key, values] of Object.entries(buckets)) {
    if (values.length >= minOccurrences) {
      const avg = mean(values);
      const sd = stdDev(values);
      const [dow, hour] = key.split('-').map(Number);
      patterns.push({ dayOfWeek: dow, hour, avg, stdDev: sd, count: values.length });
    }
  }
  return patterns.sort((a, b) => a.avg - b.avg);
}

// Clamp value between min and max
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// Normalize value to 0-100 range
export function normalize(value, min, max) {
  if (max === min) return 50;
  return clamp(((value - min) / (max - min)) * 100, 0, 100);
}
