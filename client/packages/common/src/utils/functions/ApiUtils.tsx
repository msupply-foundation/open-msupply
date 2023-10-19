export const setNullableInput = <NODE, KEY extends keyof NODE>(
  key: KEY,
  entity?: NODE | null | undefined
) => {
  if (!entity) return undefined;

  if (entity == null) return { value: undefined };

  return { value: entity[key] };
};
