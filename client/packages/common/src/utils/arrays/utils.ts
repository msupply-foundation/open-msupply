export const ifTheSameElseDefault = <T, K extends keyof T, J>(
  someEntities: T[],
  key: K,
  defaultValue: J
): J | T[K] => {
  if (someEntities.length === 0) {
    return defaultValue;
  }
  const entities = someEntities as [T, ...T[]];
  const value = entities[0][key];
  const allTheSame = entities.every(entity => {
    return entity[key] === value;
  });
  return allTheSame ? value : defaultValue;
};

export const arrayToRecord = <T extends { id: string }>(
  array: T[]
): Record<string, T> => {
  return array.reduce((acc, value) => {
    acc[value.id] = value;
    return acc;
  }, {} as Record<string, T>);
};
