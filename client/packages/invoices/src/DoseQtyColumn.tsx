import {
  ColumnAlign,
  ColumnDefinition,
  RecordWithId,
  UNDEFINED_STRING_VALUE,
} from '@openmsupply-client/common';
import { ItemRowFragment } from '@openmsupply-client/system';

type VaccineItemRow = {
  item: ItemRowFragment;
  numberOfPacks: number;
  packSize: number;
  itemVariant?: { dosesPerUnit: number } | null;
};

export const getDosesQuantityColumn = <
  T extends RecordWithId & (VaccineItemRow | { lines: VaccineItemRow[] }),
>(): ColumnDefinition<T> => ({
  key: 'doseQuantity',
  label: 'label.doses',
  width: 100,
  align: ColumnAlign.Right,
  accessor: ({ rowData }) => {
    if ('lines' in rowData) {
      const { lines } = rowData;

      const isVaccine = lines[0]?.item?.isVaccine ?? false;
      const totalDoses = lines.reduce(
        (sum, { packSize, numberOfPacks, item, itemVariant }) =>
          sum +
          packSize * numberOfPacks * (itemVariant?.dosesPerUnit ?? item.doses),
        0
      );

      return isVaccine ? totalDoses : UNDEFINED_STRING_VALUE;
    } else {
      const unitQty = rowData.numberOfPacks * rowData.packSize;
      return rowData.item && rowData.item.isVaccine
        ? unitQty * (rowData.itemVariant?.dosesPerUnit ?? rowData.item.doses)
        : UNDEFINED_STRING_VALUE;
    }
  },
  getSortValue: rowData => {
    if ('lines' in rowData) {
      const { lines } = rowData;

      const isVaccine = lines[0]?.item?.isVaccine ?? false;
      const totalDoses = lines.reduce(
        (sum, { packSize, numberOfPacks, item, itemVariant }) =>
          sum +
          packSize * numberOfPacks * (itemVariant?.dosesPerUnit ?? item.doses),
        0
      );

      return isVaccine ? totalDoses : 0;
    } else {
      const unitQty = rowData.numberOfPacks * rowData.packSize;
      return rowData.item && rowData.item.isVaccine
        ? unitQty * (rowData.itemVariant?.dosesPerUnit ?? rowData.item.doses)
        : 0;
    }
  },
  defaultHideOnMobile: true,
});
