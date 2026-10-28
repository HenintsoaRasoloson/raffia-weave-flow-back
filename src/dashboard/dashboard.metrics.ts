export type KpiTrend = 'up' | 'down' | 'neutral';

export type KpiDelta = {
  delta: string;
  trend: KpiTrend;
};

const PERCENT_EPS = 0.05;

export function percentDelta(current: number, previous: number): KpiDelta {
  if (current === 0 && previous === 0) {
    return { delta: '—', trend: 'neutral' };
  }
  if (previous === 0) {
    return { delta: 'nouveau', trend: current > 0 ? 'up' : 'down' };
  }

  const pct = ((current - previous) / previous) * 100;
  if (Math.abs(pct) < PERCENT_EPS) {
    return { delta: '0.0%', trend: 'neutral' };
  }

  return {
    delta: `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`,
    trend: pct > 0 ? 'up' : 'down',
  };
}

export function absoluteDelta(current: number, previous: number): KpiDelta {
  const diff = current - previous;
  if (current === 0 && previous === 0) {
    return { delta: '—', trend: 'neutral' };
  }
  if (diff === 0) {
    return { delta: '0', trend: 'neutral' };
  }

  return {
    delta: `${diff > 0 ? '+' : ''}${diff}`,
    trend: diff > 0 ? 'up' : 'down',
  };
}

export function signedDelta(
  diff: number,
  format: (value: number) => string,
): KpiDelta {
  if (diff === 0) {
    return { delta: '—', trend: 'neutral' };
  }

  return {
    delta: format(diff),
    trend: diff > 0 ? 'up' : 'down',
  };
}
