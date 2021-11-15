export const ifTheSameElseDefault = <
  T,
  K extends keyof T,
  J extends T[K] | undefined
>(
  someEntities: T[],
  key: K,
  defaultValue: J
): J => {
  const value = someEntities[0]?.[key] as J;
  const allTheSame = someEntities.every(entity => entity[key] === value);
  return allTheSame && value ? value : defaultValue;
};

export const arrayToRecord = <T extends { id: string }>(
  array: T[]
): Record<string, T> => {
  return array.reduce((acc, value) => {
    acc[value.id] = value;
    return acc;
  }, {} as Record<string, T>);
};
