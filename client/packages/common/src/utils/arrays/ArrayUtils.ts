import { RecordPatch, RecordWithId } from '@common/types';
import groupBy from 'lodash/groupBy';
import uniqBy from 'lodash/uniqBy';
import keyBy from 'lodash/keyBy';
import uniq from 'lodash/uniq';

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
  dedup: uniq,
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
};
