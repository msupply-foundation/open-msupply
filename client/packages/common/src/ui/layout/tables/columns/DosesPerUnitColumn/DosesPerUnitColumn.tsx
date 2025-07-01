import {
  LocaleKey,
  RecordWithId,
  TypedTFunction,
  UNDEFINED_STRING_VALUE,
} from '@openmsupply-client/common';
import { ItemRowFragment } from '@openmsupply-client/system';
import { ColumnAlign, ColumnDefinition } from '../types';

type VaccineItemRow = {
  item?: ItemRowFragment | null;
  itemVariant?: { dosesPerUnit: number } | null;
};

export const getDosesPerUnitColumn = <
  T extends RecordWithId & (VaccineItemRow | { lines: VaccineItemRow[] }),
>(
  t: TypedTFunction<LocaleKey>,
  unitName?: string
): ColumnDefinition<T> => ({
  label: unitName
    ? t('label.doses-per-unit-name', {
        unit: unitName,
      })
    : 'label.doses-per-unit',
  key: 'dosesPerUnit',
  width: 100,
  sortable: false,
  align: ColumnAlign.Right,
  accessor: ({ rowData }) => {
    if ('lines' in rowData) {
      const { lines } = rowData;
      if (Array.isArray(lines) && lines[0]?.item?.isVaccine) {
        const doses = lines.map(
          ({ item, itemVariant }) =>
            itemVariant?.dosesPerUnit ?? item?.doses ?? UNDEFINED_STRING_VALUE
        );
        const dosesTheSame = doses.every(dose => dose === doses[0]);
        return dosesTheSame ? doses[0] : t('multiple');
      } else {
        return UNDEFINED_STRING_VALUE;
      }
    } else {
      return rowData?.item?.isVaccine
        ? (rowData.itemVariant?.dosesPerUnit ??
            rowData?.item?.doses ??
            UNDEFINED_STRING_VALUE)
        : UNDEFINED_STRING_VALUE;
    }
  },
  defaultHideOnMobile: true,
});
