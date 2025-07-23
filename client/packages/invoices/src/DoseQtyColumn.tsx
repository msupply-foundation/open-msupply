import {
  ArrayUtils,
  ColumnAlign,
  ColumnDefinition,
  RecordWithId,
  UNDEFINED_STRING_VALUE,
  useFormatNumber,
} from '@openmsupply-client/common';
import { ItemRowFragment } from '@openmsupply-client/system';

type VaccineItemRow = {
  item: ItemRowFragment;
  numberOfPacks: number;
  packSize: number;
};

const getDosesValue = (
  rowData: VaccineItemRow | { lines: VaccineItemRow[] }
) => {
  if ('lines' in rowData) {
    const { lines } = rowData;

    const isVaccine = lines[0]?.item?.isVaccine ?? false;
    const unitQuantity = ArrayUtils.getUnitQuantity(lines);
    return isVaccine ? unitQuantity * (lines[0]?.item?.doses ?? 1) : null;
  } else {
    const unitQty = (rowData?.numberOfPacks ?? 0) * (rowData?.packSize ?? 1);
    return rowData.item && rowData.item.isVaccine
      ? unitQty * (rowData.item.doses ?? 1)
      : null;
  }
};

export const getDosesQuantityColumn = <
  T extends RecordWithId & (VaccineItemRow | { lines: VaccineItemRow[] }),
>(): ColumnDefinition<T> => ({
  key: 'doseQuantity',
  label: 'label.doses',
  width: 100,
  align: ColumnAlign.Right,
  accessor: ({ rowData }) => {
    getDosesValue(rowData);
  },
  Cell: props => {
    const { rowData } = props;
    const { round } = useFormatNumber();
    const value = getDosesValue(rowData);
    // doses always rounded to display in whole numbers
    return value != null ? round(value) : UNDEFINED_STRING_VALUE;
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
