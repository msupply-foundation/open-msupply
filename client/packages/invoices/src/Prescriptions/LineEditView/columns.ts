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
      key: 'dosesPerPack',
      label: `${t('label.doses-per')} ${unit}`,
      width: 100,
      align: ColumnAlign.Right,
      accessor: ({ rowData }) => rowData.item?.doses,
    });
  } else {
    columns.push(['packSize', { width: 90 }]);
  }

  columns.push(
    {
      Cell: NumberCell,
      label: getColumnLabelWithPackOrUnit({
        t,
        displayInDoses,
        displayDosesInUnitName: true,
        itemUnit: unit,
        columnLabel: t('label.in-stock'),
      }),
      key: 'totalUnits',
      align: ColumnAlign.Right,
      width: 80,
      accessor: ({ rowData }) => {
        return (
          (rowData.stockLine?.totalNumberOfPacks ?? 0) *
          (rowData.stockLine?.packSize ?? 1)
        );
      },
    },
    {
      Cell: NumberCell,
      label: getColumnLabelWithPackOrUnit({
        t,
        displayInDoses,
        itemUnit: unit,
        columnLabel: t('label.available'),
      }),
      key: 'availableUnits',
      align: ColumnAlign.Right,
      width: 85,
      accessor: ({ rowData }) => {
        const total =
          (rowData.stockLine?.availableNumberOfPacks ?? 0) *
          (rowData.stockLine?.packSize ?? 1);
        return displayInDoses ? total * (rowData.item?.doses ?? 1) : total;
      },
    },
    {
      Cell: UnitQuantityCell,
      label: getColumnLabelWithPackOrUnit({
        t,
        displayInDoses,
        itemUnit: unit,
        columnLabel: t('label.issued'),
      }),
      key: 'unitQuantity',
      align: ColumnAlign.Right,
      width: 120,
      setter: ({ packSize, id, unitQuantity, item }) => {
        if (displayInDoses && item?.isVaccine && item?.doses) {
          onChange(id, (unitQuantity ?? 0) / (packSize ?? 1) / item.doses);
        } else {
          onChange(id, (unitQuantity ?? 0) / (packSize ?? 1));
        }
      },
      accessor: ({ rowData }) => {
        const total = (rowData.numberOfPacks ?? 0) * (rowData.packSize ?? 1);
        return displayInDoses
          ? NumUtils.round(total * (rowData.item?.doses ?? 1))
          : total;
      },
    }
  );

  return useColumns(columns, {}, [onChange]);
};
