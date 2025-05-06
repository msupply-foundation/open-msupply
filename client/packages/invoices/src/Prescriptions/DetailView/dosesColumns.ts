import {
  ColumnDescription,
  ArrayUtils,
  UNDEFINED_STRING_VALUE,
} from '@openmsupply-client/common';
import { StockOutItem } from '../../types';
import { StockOutLineFragment } from '../../StockOut';

export const getPrescriptionDosesQuantityColumn = (): ColumnDescription<
  StockOutLineFragment | StockOutItem
> => ({
  key: 'dosesQuantity',
  label: 'label.doses',
  accessor: ({ rowData }) => {
    if ('lines' in rowData) {
      const { lines } = rowData;
      const isVaccine = lines[0]?.item.isVaccine ?? false;
      const unitQuantity = ArrayUtils.getUnitQuantity(lines);
      const doses = lines[0]?.item.doses ?? 1;

      return isVaccine ? unitQuantity * doses : UNDEFINED_STRING_VALUE;
    } else {
      const unitQuantity = rowData.numberOfPacks * rowData.packSize;
      return rowData.item.isVaccine
        ? unitQuantity * (rowData.item.doses ?? 1)
        : UNDEFINED_STRING_VALUE;
    }
  },
  getSortValue: rowData => {
    if ('lines' in rowData) {
      const { lines } = rowData;
      const isVaccine = lines[0]?.item.isVaccine ?? false;
      const unitQuantity = ArrayUtils.getUnitQuantity(lines);
      const doses = lines[0]?.item.doses ?? 1;

      return isVaccine ? unitQuantity * doses : UNDEFINED_STRING_VALUE;
    } else {
      const unitQuantity = rowData.numberOfPacks * rowData.packSize;
      return rowData.item.isVaccine
        ? unitQuantity * (rowData.item.doses ?? 1)
        : UNDEFINED_STRING_VALUE;
    }
  },
});
