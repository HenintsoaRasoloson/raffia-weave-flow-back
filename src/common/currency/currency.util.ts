import { BadRequestException } from '@nestjs/common';
import {
  DEFAULT_CURRENCY,
  SUPPORTED_CURRENCIES,
  type CurrencyCode,
} from './currency.constants';

export function isSupportedCurrency(value: string): value is CurrencyCode {
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(value);
}

export function normalizeCurrency(
  value?: string | null,
  fallback: CurrencyCode = DEFAULT_CURRENCY,
): CurrencyCode {
  if (value === undefined || value === null || value.trim() === '') {
    return fallback;
  }
  const upper = value.trim().toUpperCase();
  if (!isSupportedCurrency(upper)) {
    throw new BadRequestException(
      `Devise non supportée: ${value}. Autorisées: ${SUPPORTED_CURRENCIES.join(', ')}`,
    );
  }
  return upper;
}

/**
 * Convertit un montant entre MGA et EUR.
 * Convention: eurToMgaRate = nombre d’Ariary pour 1 Euro.
 */
export function convertAmount(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode,
  eurToMgaRate: number,
): number {
  if (!Number.isFinite(amount)) {
    throw new BadRequestException('Montant invalide');
  }
  if (!(eurToMgaRate > 0)) {
    throw new BadRequestException(
      'Taux de change invalide: eurToMgaRate doit être > 0',
    );
  }
  if (from === to) {
    return roundMoney(amount);
  }
  if (from === 'MGA' && to === 'EUR') {
    return roundMoney(amount / eurToMgaRate);
  }
  if (from === 'EUR' && to === 'MGA') {
    return roundMoney(amount * eurToMgaRate);
  }
  throw new BadRequestException(
    `Conversion non supportée: ${from} → ${to}`,
  );
}

export function roundMoney(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/** Decimal Prisma → number pour API. */
export function decimalToNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (value != null && typeof value === 'object' && 'toNumber' in value) {
    return (value as { toNumber: () => number }).toNumber();
  }
  return Number(value);
}

function currencyUnit(currency: CurrencyCode): 'Ar' | '€' {
  return currency === 'MGA' ? 'Ar' : '€';
}

/**
 * Libellé monétaire lisible (jamais de compact « k€ »).
 * 170 000 Ar, pas 0,0 k€.
 */
export function formatMoneyLabel(
  amount: number,
  currency: string = DEFAULT_CURRENCY,
): string {
  const code = isSupportedCurrency(currency) ? currency : DEFAULT_CURRENCY;
  const value = Number.isFinite(amount) ? amount : 0;
  const number = new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: code === 'MGA' ? 0 : 2,
    minimumFractionDigits: 0,
  }).format(value);
  return `${number} ${currencyUnit(code)}`;
}

export function formatSignedMoneyLabel(
  amount: number,
  currency: string = DEFAULT_CURRENCY,
): string {
  const formatted = formatMoneyLabel(Math.abs(amount), currency);
  if (amount > 0) return `+${formatted}`;
  if (amount < 0) return `-${formatted}`;
  return formatted;
}
