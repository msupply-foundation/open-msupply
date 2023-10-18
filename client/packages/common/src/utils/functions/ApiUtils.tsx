type NullableStringInput = undefined | { value: string | undefined };

export const setOptionString = <
  NODE,
  KEY extends keyof NODE,
  NODE_WITH_STIRNG_KEY extends Record<KEY, string>,
>(
  key: KEY,
  entity?: NODE_WITH_STIRNG_KEY | null
): NullableStringInput => {
  if (!entity) return undefined;

  if (entity == null) return { value: undefined };

  return { value: entity[key] };
};
