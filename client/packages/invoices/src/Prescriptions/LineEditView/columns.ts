import {
  ColumnAlign,
  ColumnDescription,
  ExpiryDateCell,
  NumberCell,
  NumUtils,
  useColumns,
  useIntlUtils,
  usePreferences,
  useTranslation,
} from '@openmsupply-client/common';
import { DraftPrescriptionLine } from '../../types';
import { UnitQuantityCell } from '../api/hooks/utils';

export const usePrescriptionLineEditColumns = ({
  onChange,
  isVaccine,
  unit,
}: {
  onChange: (key: string, numPacks: number) => void;
  unit: string;
  isVaccine?: boolean;
}) => {
  const t = useTranslation();
  const { data: preferences } = usePreferences();
  const { getColumnLabelWithPackOrUnit } = useIntlUtils();
  const displayInDoses = !!preferences?.displayVaccineInDoses && !!isVaccine;

  const columns: ColumnDescription<
    DraftPrescriptionLine & { unitQuantity?: number }
  >[] = [
    [
      'expiryDate',
      {
        Cell: ExpiryDateCell,
        width: 80,
      },
    ],
    [
      'batch',
      {
        accessor: ({ rowData }) => rowData.stockLine?.batch,
      },
    ],
  ];

  if (displayInDoses) {
    columns.push({
      key: 'doses-per-pack',
      label: `${t('label.doses-per')} ${unit}`,
      width: 100,
      align: ColumnAlign.Right,
      accessor: ({ rowData }) => rowData.item?.doses,
    });
  }

  columns.push(
    ['packSize', { width: 90 }],
    {
      Cell: NumberCell,
      label: getColumnLabelWithPackOrUnit({
        t,
        displayInDoses,
        itemUnit: unit,
        columnName: t('label.in-stock'),
      }),
      key: 'totalUnits',
      align: ColumnAlign.Right,
      width: 80,
      accessor: ({ rowData }) => {
        return displayInDoses
          ? (rowData.stockLine?.totalNumberOfPacks ?? 0) *
              (rowData.item?.doses ?? 1)
          : (rowData.stockLine?.totalNumberOfPacks ?? 0) *
              (rowData.stockLine?.packSize ?? 1);
      },
    },
    {
      Cell: NumberCell,
      label: getColumnLabelWithPackOrUnit({
        t,
        displayInDoses,
        itemUnit: unit,
        columnName: t('label.available'),
      }),
      key: 'availableUnits',
      align: ColumnAlign.Right,
      width: 85,
      accessor: ({ rowData }) => {
        return displayInDoses
          ? (rowData.stockLine?.availableNumberOfPacks ?? 0) *
              (rowData.item?.doses ?? 1)
          : (rowData.stockLine?.availableNumberOfPacks ?? 0) *
              (rowData.stockLine?.packSize ?? 1);
      },
    },
    {
      Cell: UnitQuantityCell,
      label: getColumnLabelWithPackOrUnit({
        t,
        displayInDoses,
        itemUnit: unit,
        columnName: t('label.issued'),
      }),
      key: 'unitQuantity',
      align: ColumnAlign.Right,
      width: 120,
      setter: ({ packSize, id, unitQuantity, item }) => {
        if (displayInDoses) {
          onChange(id, (unitQuantity ?? 0) / (item?.doses ?? 1));
        } else {
          onChange(id, (unitQuantity ?? 0) / (packSize ?? 1));
        }
      },
      accessor: ({ rowData }) => {
        return displayInDoses
          ? NumUtils.round(
              (rowData.numberOfPacks ?? 0) * (rowData.item?.doses ?? 1),
              3
            )
          : NumUtils.round(
              (rowData.numberOfPacks ?? 0) * (rowData.packSize ?? 1),
              3
            );
      },
    }
  );

  return useColumns(columns, {}, [onChange]);
};
