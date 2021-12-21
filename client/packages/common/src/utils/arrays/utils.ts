export const ifTheSameElseDefault = <T, K extends keyof T, J>(
  someEntities: T[],
  key: K,
  defaultValue: J
): J | T[K] => {
  const value = someEntities[0]?.[key];
  const allTheSame = someEntities.every(entity => {
    return entity[key] === value;
  });
  return allTheSame && value != undefined ? value : defaultValue;
};

export const arrayToRecord = <T extends { id: string }>(
  array: T[]
): Record<string, T> => {
  return array.reduce((acc, value) => {
    acc[value.id] = value;
    return acc;
  }, {} as Record<string, T>);
};
