import {
  convertAmount,
  formatMoneyLabel,
  formatSignedMoneyLabel,
  normalizeCurrency,
  roundMoney,
} from './currency.util';

describe('currency.util', () => {
  it('normalizeCurrency defaults to MGA', () => {
    expect(normalizeCurrency(undefined)).toBe('MGA');
    expect(normalizeCurrency('')).toBe('MGA');
    expect(normalizeCurrency('eur')).toBe('EUR');
  });

  it('normalizeCurrency rejects unsupported codes', () => {
    expect(() => normalizeCurrency('USD')).toThrow(/Devise non supportée/);
  });

  it('converts MGA to EUR with rate 1 EUR = 5000 MGA', () => {
    expect(convertAmount(10000, 'MGA', 'EUR', 5000)).toBe(2);
    expect(convertAmount(5000, 'MGA', 'EUR', 5000)).toBe(1);
  });

  it('converts EUR to MGA', () => {
    expect(convertAmount(2, 'EUR', 'MGA', 5000)).toBe(10000);
  });

  it('rejects non-positive rate', () => {
    expect(() => convertAmount(100, 'MGA', 'EUR', 0)).toThrow(
      /Taux de change invalide/,
    );
  });

  it('roundMoney rounds to 2 decimals', () => {
    expect(roundMoney(1.005)).toBe(1.01);
  });

  it('formats MGA without compact k€', () => {
    const formatted = formatMoneyLabel(170_000, 'MGA');
    expect(formatted).toMatch(/170/);
    expect(formatted.toLowerCase()).toMatch(/mga|ariary/);
    expect(formatted).not.toMatch(/€/);
    expect(formatted.toLowerCase()).not.toMatch(/k€|0\.0k/);
  });

  it('formats a 34 EUR amount without collapsing to 0.0k', () => {
    const formatted = formatMoneyLabel(34, 'EUR');
    expect(formatted).toMatch(/34/);
    expect(formatted).not.toMatch(/0[.,]0\s*k/i);
  });

  it('prefixes positive treasury deltas', () => {
    const formatted = formatSignedMoneyLabel(12_000, 'MGA');
    expect(formatted.startsWith('+')).toBe(true);
    expect(formatted).toMatch(/12/);
  });
});
