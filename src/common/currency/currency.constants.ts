/** Devises supportées MVP. */
export const SUPPORTED_CURRENCIES = ['MGA', 'EUR'] as const;

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

/** Devise de référence / défaut système. */
export const DEFAULT_CURRENCY: CurrencyCode = 'MGA';

/**
 * Taux seed : nombre d’Ariary pour 1 Euro.
 * Modifiable via CompanySetting.eurToMgaRate.
 */
export const DEFAULT_EUR_TO_MGA_RATE = 5000;
