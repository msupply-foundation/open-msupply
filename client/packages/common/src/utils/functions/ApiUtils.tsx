export const setNullableInput = <NODE, KEY extends keyof NODE>(
  key: KEY,
  entity?: NODE | null | undefined
) => {
  if (entity == null) return { value: undefined };

  if (!entity) return undefined;

  return { value: entity[key] };
};
