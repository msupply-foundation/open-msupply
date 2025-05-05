import {
  LocaleKey,
  RecordWithId,
  TypedTFunction,
  UNDEFINED_STRING_VALUE,
} from '@openmsupply-client/common';
import { ItemRowFragment } from '@openmsupply-client/system';
import { ColumnDefinition } from '../types';

export const getDosesPerUnitColumn = <
  T extends RecordWithId & { item?: ItemRowFragment | null },
>(
  t: TypedTFunction<LocaleKey>
): ColumnDefinition<T> => ({
  label: 'label.doses-per-unit',
  key: 'dosesPerUnit',
  accessor: ({ rowData }) => {
    if ('lines' in rowData) {
      const { lines } = rowData;
      if (Array.isArray(lines) && lines[0]?.item?.isVaccine) {
        const doses = lines.map(
          ({ item }) => item?.doses ?? UNDEFINED_STRING_VALUE
        );
        const dosesTheSame = doses.every(dose => dose === doses[0]);
        return dosesTheSame ? doses[0] : t('multiple');
      } else {
        return UNDEFINED_STRING_VALUE;
      }
    } else {
      return rowData?.item?.isVaccine
        ? (rowData?.item?.doses ?? UNDEFINED_STRING_VALUE)
        : UNDEFINED_STRING_VALUE;
    }
  },
});
