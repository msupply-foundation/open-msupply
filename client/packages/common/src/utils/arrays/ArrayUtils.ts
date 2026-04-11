import { RecordPatch, RecordWithId } from '@common/types';

const _groupBy = <T>(
  arr: T[],
  fn: ((item: T) => string) | string
): Record<string, T[]> =>
  arr.reduce(
    (acc, item) => {
      const key =
        typeof fn === 'function'
          ? fn(item)
          : (item as Record<string, unknown>)[fn as string] as string;
      (acc[key] = acc[key] || []).push(item);
      return acc;
    },
    {} as Record<string, T[]>
  );

const _uniqBy = <T>(arr: T[], fn: ((item: T) => unknown) | string): T[] =>
  [
    ...new Map(
      arr.map(item => [
        typeof fn === 'function'
          ? fn(item)
          : (item as Record<string, unknown>)[fn as string],
        item,
      ])
    ).values(),
  ];

const _keyBy = <T>(
  arr: T[],
  fn: ((item: T) => string) | string
): Record<string, T> =>
  Object.fromEntries(
    arr.map(item => [
      typeof fn === 'function'
        ? fn(item)
        : (item as Record<string, unknown>)[fn as string],
      item,
    ])
  );

const _uniq = <T>(arr: T[]): T[] => [...new Set(arr)];

const _partition = <T>(
  arr: T[],
  predicate: (item: T) => boolean
): [T[], T[]] => {
  const pass: T[] = [];
  const fail: T[] = [];
  arr.forEach(item => (predicate(item) ? pass : fail).push(item));
  return [pass, fail];
};

export const ArrayUtils = {
  ifTheSameElseDefault: <T, K extends keyof T, J>(
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
  },
  getUnitQuantity: (
    arr: {
      numberOfPacks: number;
      packSize: number;
    }[]
  ) => {
    return arr.reduce(
      (sum, someEntity) => sum + someEntity.numberOfPacks * someEntity.packSize,
      0
    );
  },
  getSum: <T extends Record<K, number>, K extends string>(
    arr: T[],
    key: K
  ): number => {
    return arr.reduce((sum, someEntity) => sum + someEntity[key], 0);
  },
  // De-duplicate (remove duplicates)
  dedupe: _uniq,
  immutablePatch: <T extends RecordWithId>(arr: T[], patch: RecordPatch<T>) =>
    arr.map(entity => {
      if (entity.id === patch.id) {
        return {
          ...entity,
          ...patch,
        };
      }
      return entity;
    }),
  groupBy: _groupBy,
  uniqBy: _uniqBy,
  keyBy: _keyBy,
  flatMap: <T, U>(arr: T[], fn: (item: T) => U[]): U[] => arr.flatMap(fn),
  partition: _partition,
  toObject: <T extends RecordWithId>(arr: T[]) => {
    const obj: Record<string, T> = {};
    arr.forEach(t => (obj[t.id] = { ...t }));
    return obj;
  },

  getAveragePrice: <
    T extends {
      numberOfPacks: number;
      packSize: number;
    },
    K extends keyof T,
  >(
    arr: T[],
    key: K
  ) => {
    let totalPrice = 0;
    let totalUnits = 0;
    arr.forEach(entity => {
      totalPrice += Number(entity[key]) * entity.numberOfPacks;
      totalUnits += entity.numberOfPacks * entity.packSize;
    });
    const averagePrice = totalPrice / totalUnits;

    return Number.isNaN(averagePrice) ? 0 : averagePrice;
  },
};
