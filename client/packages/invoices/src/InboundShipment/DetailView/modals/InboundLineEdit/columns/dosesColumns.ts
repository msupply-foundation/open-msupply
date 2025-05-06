import {
  ColumnAlign,
  ColumnDescription,
  LocaleKey,
  NumberCell,
  NumberInputCell,
  TypedTFunction,
} from '@openmsupply-client/common';
import { DraftInboundLine } from '../../../../../types';

export const getDosesPerPackColumn = (
  t: TypedTFunction<LocaleKey>,
  unitName: string
): ColumnDescription<DraftInboundLine> => ({
  key: 'dosesPerPack',
  label: t('label.doses-per-unit-name', {
    unit: unitName,
  }),
  width: 100,
  align: ColumnAlign.Right,
  Cell: NumberCell,
  accessor: ({ rowData }) => rowData.item?.doses,
});

export const getInboundDosesColumns = (
  t: TypedTFunction<LocaleKey>,
  updateDraftLine: (patch: Partial<DraftInboundLine> & { id: string }) => void,
  unitName: string
): ColumnDescription<DraftInboundLine>[] => [
  {
    key: 'unitsPerPack',
    label: t('label.units-received', {
      unit: unitName,
    }),
    Cell: NumberInputCell,
    width: 100,
    align: ColumnAlign.Right,
    setter: patch => {
      const { unitsPerPack, packSize } = patch;

      if (packSize !== undefined && unitsPerPack !== undefined) {
        const vialsToPacks = unitsPerPack / packSize;

        updateDraftLine({
          ...patch,
          unitsPerPack,
          numberOfPacks: vialsToPacks,
        });
      }
    },
    accessor: ({ rowData }) => {
      return rowData.numberOfPacks * rowData.packSize;
    },
  },
  {
    key: 'doseQuantity',
    label: 'label.doses-received',
    align: ColumnAlign.Right,
    width: 100,
    accessor: ({ rowData }) => {
      const total = rowData.numberOfPacks * rowData.packSize;
      return total * rowData.item.doses;
    },
  },
];
