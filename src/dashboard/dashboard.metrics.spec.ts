import { absoluteDelta, percentDelta, signedDelta } from './dashboard.metrics';

describe('dashboard KPI deltas', () => {
  it('does not paint a green arrow when both periods are zero', () => {
    expect(percentDelta(0, 0)).toEqual({ delta: '—', trend: 'neutral' });
    expect(absoluteDelta(0, 0)).toEqual({ delta: '—', trend: 'neutral' });
    expect(signedDelta(0, (value) => `${value}`)).toEqual({
      delta: '—',
      trend: 'neutral',
    });
  });

  it('marks a first non-zero period as nouveau instead of +0.0%', () => {
    expect(percentDelta(184_300, 0)).toEqual({
      delta: 'nouveau',
      trend: 'up',
    });
  });

  it('keeps a real percentage with a signed trend', () => {
    expect(percentDelta(110, 100)).toEqual({ delta: '+10.0%', trend: 'up' });
    expect(percentDelta(90, 100)).toEqual({ delta: '-10.0%', trend: 'down' });
  });

  it('treats a flat period as neutral', () => {
    expect(percentDelta(100, 100)).toEqual({ delta: '0.0%', trend: 'neutral' });
    expect(absoluteDelta(4, 4)).toEqual({ delta: '0', trend: 'neutral' });
  });
});
