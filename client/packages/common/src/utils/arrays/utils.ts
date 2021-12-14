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

// Converts some array of entities to a map of entities
// where the value of each key is an array of entities
export const groupBy = <T, K extends keyof T & string>(
  things: T[],
  key: K
): Record<string, T[]> => {
  const lookup: Record<string, T[]> = {} as Record<string, T[]>;
  things.forEach(thing => {
    const value = String(thing[key]);
    if (!lookup[value]) {
      lookup[value] = [];
    }
    (lookup[value] ?? []).push(thing);
  });
  return lookup;
};
