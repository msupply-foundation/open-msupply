import { RecordPatch, RecordWithId } from '@common/types';
import groupBy from 'lodash/groupBy';
import uniqBy from 'lodash/uniqBy';
import keyBy from 'lodash/keyBy';
import uniq from 'lodash/uniq';
import flatMap from 'lodash/flatMap';
import partition from 'lodash/partition';

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
  dedupe: uniq,
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
  groupBy,
  uniqBy,
  keyBy,
  flatMap,
  partition,
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
