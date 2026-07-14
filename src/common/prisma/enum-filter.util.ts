type EnumConst = Record<string, string>;

export function toEnumValue<T extends string>(
  value: string | undefined,
  enumConst: EnumConst,
): T | undefined {
  if (!value) {
    return undefined;
  }

  if (!Object.values(enumConst).includes(value)) {
    return undefined;
  }

  return value as T;
}

export function enumWhere<T extends string, K extends string>(
  field: K,
  value: string | undefined,
  enumConst: EnumConst,
): Partial<Record<K, T>> {
  const parsed = toEnumValue<T>(value, enumConst);
  return parsed ? { [field]: parsed } : {};
}
