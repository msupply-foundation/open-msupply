export const getUnitQuantity = (
  sum: number,
  someEntity: {
    numberOfPacks: number;
    packSize: number;
  }
): number => {
  return sum + someEntity.numberOfPacks * someEntity.packSize;
};

export const getSumOfKeyReducer =
  <T extends Record<K, number>, K extends string>(key: K) =>
  (sum: number, someEntity: T): number => {
    return sum + someEntity[key];
  };
