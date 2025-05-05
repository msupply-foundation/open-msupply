import {
  ColumnDescription,
  ArrayUtils,
  UNDEFINED_STRING_VALUE,
  ColumnAlign,
  CurrencyCell,
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

export const getPrescriptionDosesSellPriceColumn = (): ColumnDescription<
  StockOutLineFragment | StockOutItem
> => ({
  label: 'label.dose-price',
  key: 'sellPricePerDose',
  align: ColumnAlign.Right,
  Cell: CurrencyCell,
  sortable: false,
  accessor: ({ rowData }) => {
    if ('lines' in rowData) {
      const { lines } = rowData;
      const isVaccine = lines[0]?.item.isVaccine ?? false;

      let totalCostPrice = 0;
      let totalUnits = 0;

      for (const line of lines) {
        const units = line.numberOfPacks * line.packSize;
        totalCostPrice += line.costPricePerPack * line.numberOfPacks;
        totalUnits += units * line.item.doses;
      }

      if (totalCostPrice === 0 && totalUnits === 0) return null;
      return isVaccine ? totalCostPrice / totalUnits : null;
    } else {
      const costPricePerPack = rowData.costPricePerPack ?? 0;
      return rowData.item.isVaccine
        ? (costPricePerPack * rowData.numberOfPacks) / rowData.item.doses
        : null;
    }
  },
});

export const getPrescriptionDosesCostColumn = (): ColumnDescription<
  StockOutLineFragment | StockOutItem
> => ({
  label: 'label.dose-purchase-price',
  key: 'dosesPurchasePrice',
  align: ColumnAlign.Right,
  Cell: CurrencyCell,
  sortable: false,
  accessor: ({ rowData }) => {
    if ('lines' in rowData) {
      const { lines } = rowData;
      const isVaccine = lines[0]?.item.isVaccine ?? false;

      let totalSellPrice = 0;
      let totalUnits = 0;

      for (const line of lines) {
        const units = line.numberOfPacks * line.packSize;
        totalSellPrice += line.sellPricePerPack * line.numberOfPacks;
        totalUnits += units * line.item.doses;
      }

      if (totalSellPrice === 0 && totalUnits === 0) return null;
      return isVaccine ? totalSellPrice / totalUnits : null;
    } else {
      const sellPricePerPack = rowData.sellPricePerPack ?? 0;
      return rowData.item.isVaccine
        ? (sellPricePerPack * rowData.numberOfPacks) / rowData.item.doses
        : null;
    }
  },
});
