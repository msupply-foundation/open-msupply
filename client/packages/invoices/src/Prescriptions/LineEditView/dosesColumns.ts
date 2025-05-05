import {
  ColumnAlign,
  ColumnDescription,
  GetNumberColumnLabelProps,
  LocaleKey,
  NumberCell,
  TypedTFunction,
} from '@openmsupply-client/common';
import { DraftPrescriptionLine } from '../../types';
import { DosesQuantityCell } from '../api/hooks/utils';

export const getDosesPerPackColumn = (
  t: TypedTFunction<LocaleKey>,
  unitName: string
): ColumnDescription<DraftPrescriptionLine> => ({
  key: 'dosesPerPack',
  label: t('label.doses-per-unit-name', {
    unit: unitName,
  }),
  width: 100,
  align: ColumnAlign.Right,
  Cell: NumberCell,
  accessor: ({ rowData }) => rowData.item?.doses,
});

export const getPrescriptionLineDosesColumns = (
  t: TypedTFunction<LocaleKey>,
  onChange: (key: string, numPacks: number) => void,
  getColumnLabelWithPackOrUnit: (props: GetNumberColumnLabelProps) => string
): ColumnDescription<DraftPrescriptionLine & { unitQuantity?: number }>[] => [
  {
    Cell: NumberCell,
    label: getColumnLabelWithPackOrUnit({
      t,
      displayInDoses: true,
      inputKey: 'available',
    }),
    key: 'availableDoses',
    align: ColumnAlign.Right,
    width: 85,
    accessor: ({ rowData }) => {
      const total =
        (rowData.stockLine?.availableNumberOfPacks ?? 0) *
        (rowData.stockLine?.packSize ?? 1);

      return total * (rowData.item?.doses ?? 1);
    },
  },
  {
    Cell: DosesQuantityCell,
    label: getColumnLabelWithPackOrUnit({
      t,
      displayInDoses: true,
      inputKey: 'issued',
    }),
    key: 'unitQuantity',
    align: ColumnAlign.Right,
    width: 120,
    setter: ({ packSize, id, unitQuantity, item }) => {
      const doses = item?.doses ?? 1;
      onChange(id, (unitQuantity ?? 0) / (packSize ?? 1) / doses);
    },
    accessor: ({ rowData }) => {
      const total = (rowData.numberOfPacks ?? 0) * (rowData.packSize ?? 1);

      return total * (rowData.item?.doses ?? 1);
    },
  },
];
