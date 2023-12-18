import { useTranslation } from '@common/intl';
import { ArrayUtils } from '@common/utils';

type DefaultValues = {
  single?: string;
  multiple?: string;
};

type BaseProps<T> = {
  row: T | { lines: T[] };
  defaults?: DefaultValues;
};

export const useColumnUtils = () => {
  const t = useTranslation();

  const getColumnEntityProperty = <T extends object>({
    row,
    entity,
    key,
    defaults,
  }: BaseProps<T> & { entity: keyof T; key: string }) => {
    if ('lines' in row) {
      const entities = row.lines.flatMap((line: T) => {
        const obj = line[entity];
        return !!obj ? [obj] : [];
      });
      if (
        entities.length !== 0 &&
        entities[0] !== undefined &&
        typeof entities[0] === 'object' &&
        key in entities[0]
      ) {
        return ArrayUtils.ifTheSameElseDefault(
          entities,
          key as keyof NonNullable<T[keyof T]>,
          defaults?.multiple ?? t('multiple')
        );
      } else {
        return '';
      }
    } else {
      return (
        row[entity]?.[key as keyof NonNullable<T[keyof T]>] ??
        defaults?.single ??
        ''
      );
    }
  };

  const getColumnProperty = <T extends object>({
    row,
    key,
    defaults,
  }: BaseProps<T> & { key: keyof T }) => {
    if ('lines' in row) {
      const { lines } = row;
      return ArrayUtils.ifTheSameElseDefault(
        lines,
        key,
        defaults?.multiple ?? t('multiple')
      );
    } else {
      return row[key] ?? defaults?.single;
    }
  };

  return { getColumnProperty, getColumnEntityProperty };
};
