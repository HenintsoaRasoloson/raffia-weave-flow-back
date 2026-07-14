export function toEnumValue<TEnum extends Record<string, string>>(
  value: string | undefined,
  enumConst: TEnum,
): TEnum[keyof TEnum] | undefined {
  if (!value) {
    return undefined;
  }

  const allowed = Object.values(enumConst) as Array<TEnum[keyof TEnum]>;
  if (!allowed.includes(value as TEnum[keyof TEnum])) {
    return undefined;
  }

  return value as TEnum[keyof TEnum];
}

export function enumWhere<
  TEnum extends Record<string, string>,
  K extends string,
>(
  field: K,
  value: string | undefined,
  enumConst: TEnum,
): Partial<Record<K, TEnum[keyof TEnum]>> {
  const parsed = toEnumValue(value, enumConst);
  if (!parsed) {
    return {};
  }

  return { [field]: parsed } as Partial<Record<K, TEnum[keyof TEnum]>>;
}
