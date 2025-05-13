import {
  ColumnAlign,
  ColumnDescription,
  ExpiryDateCell,
  Formatter,
  getDosesPerUnitColumn,
  NumberCell,
  NumUtils,
  PreferenceKey,
  useColumns,
  usePreference,
  useTranslation,
} from '@openmsupply-client/common';
import { DraftPrescriptionLine } from '../../types';
import { UnitQuantityCell } from '../api/hooks/utils';
import { getPrescriptionLineDosesColumns } from './dosesColumns';

export const usePrescriptionLineEditColumns = ({
  onChange,
  isVaccine,
  unitName,
}: {
  onChange: (key: string, numPacks: number) => void;
  isVaccine?: boolean;
  unitName: string;
}) => {
  const t = useTranslation();
  const { data: preferences } = usePreference(
    PreferenceKey.DisplayVaccineInDoses
  );
  const displayInDoses = !!preferences?.displayVaccineInDoses && !!isVaccine;
  const unit = Formatter.sentenceCase(unitName);

  const columns: ColumnDescription<
    DraftPrescriptionLine & { unitQuantity?: number }
  >[] = [
    [
      'expiryDate',
      {
        Cell: ExpiryDateCell,
        width: 100,
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
    columns.push(getDosesPerUnitColumn(t, unitName));
  } else {
    columns.push(['packSize', { width: 90 }]);
  }

  columns.push({
    Cell: NumberCell,
    label: t('label.units-in-stock', {
      unit,
    }),
    key: 'totalUnits',
    align: ColumnAlign.Right,
    width: 80,
    accessor: ({ rowData }) =>
      (rowData.stockLine?.totalNumberOfPacks ?? 0) *
      (rowData.stockLine?.packSize ?? 1),
  });

  if (displayInDoses) {
    columns.push(...getPrescriptionLineDosesColumns(onChange));
  } else {
    columns.push(
      {
        Cell: NumberCell,
        label: t('label.units-available', {
          unit,
        }),
        key: 'availableUnits',
        align: ColumnAlign.Right,
        width: 85,
        accessor: ({ rowData }) =>
          (rowData.stockLine?.availableNumberOfPacks ?? 0) *
          (rowData.stockLine?.packSize ?? 1),
      },
      {
        Cell: UnitQuantityCell,
        label: t('label.units-issued', {
          unit,
        }),
        key: 'unitQuantity',
        align: ColumnAlign.Right,
        width: 120,
        setter: ({ packSize, id, unitQuantity }) =>
          onChange(id, (unitQuantity ?? 0) / (packSize ?? 1)),
        accessor: ({ rowData }) =>
          NumUtils.round(
            (rowData.numberOfPacks ?? 0) * (rowData.packSize ?? 1),
            3
          ),
      }
    );
  }

  return useColumns(columns, {}, [onChange]);
};
