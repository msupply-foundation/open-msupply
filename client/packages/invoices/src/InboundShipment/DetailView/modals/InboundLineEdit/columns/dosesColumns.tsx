import {
  ColumnAlign,
  ColumnDescription,
  GetNumberColumnLabelProps,
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
  getColumnLabelWithPackOrUnit: (props: GetNumberColumnLabelProps) => string,
  unitName?: string | null
): ColumnDescription<DraftInboundLine>[] => [
  {
    key: 'unitsPerPack',
    label: getColumnLabelWithPackOrUnit({
      t,
      displayInDoses: true,
      displayInPack: true,
      unitName,
      inputKey: 'received',
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
  [
    'unitQuantity',
    {
      label: getColumnLabelWithPackOrUnit({
        t,
        displayInDoses: true,
        unitName,
        inputKey: 'received',
      }),
      width: 100,
      accessor: ({ rowData }) => {
        const total = rowData.numberOfPacks * rowData.packSize;
        return total * rowData.item.doses;
      },
    },
  ],
];
