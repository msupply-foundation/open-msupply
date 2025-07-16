import {
  ArrayUtils,
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
      const unitQuantity = ArrayUtils.getUnitQuantity(lines);
      return isVaccine
        ? unitQuantity * (lines[0]?.item?.doses ?? 1)
        : UNDEFINED_STRING_VALUE;
    } else {
      const unitQty = (rowData?.numberOfPacks ?? 0) * (rowData?.packSize ?? 1);
      return rowData.item && rowData.item.isVaccine
        ? unitQty * (rowData.item.doses ?? 1)
        : UNDEFINED_STRING_VALUE;
    }
  },

  getSortValue: rowData => {
    if ('lines' in rowData) {
      const { lines } = rowData;

      const isVaccine = lines[0]?.item?.isVaccine ?? false;
      const unitQuantity = ArrayUtils.getUnitQuantity(lines);
      return isVaccine ? unitQuantity * (lines[0]?.item?.doses ?? 1) : 0;
    } else {
      const unitQty = (rowData?.numberOfPacks ?? 0) * (rowData?.packSize ?? 1);
      return rowData.item && rowData.item.isVaccine
        ? unitQty * (rowData.item.doses ?? 1)
        : 0;
    }
  },
  defaultHideOnMobile: true,
});
