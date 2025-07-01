import React from 'react';
import {
  CellProps,
  ColumnAlign,
  ColumnDescription,
  ExpiryDateCell,
  Formatter,
  NumberCell,
  NumberInputCell,
  PreferenceKey,
  useColumns,
  useIntlUtils,
  usePreference,
  useTranslation,
} from '@openmsupply-client/common';
import { getPrescriptionLineDosesColumns } from './columnsDoses';
import {
  DraftItem,
  DraftStockOutLineFragment,
  AllocateInType,
  packsToQuantity,
} from '../../StockOut';

export const usePrescriptionLineEditColumns = ({
  allocate,
  item,
  allocateIn,
}: {
  allocate: (key: string, value: number) => number;
  item: DraftItem | null;
  allocateIn: AllocateInType;
  disabled?: boolean;
}) => {
  const t = useTranslation();
  const { getPlural } = useIntlUtils();

  const unit = Formatter.sentenceCase(item?.unitName ?? t('label.unit'));
  const pluralisedUnitName = getPlural(unit, 2);

  const { data: prefs } = usePreference(
    PreferenceKey.SortByVvmStatusThenExpiry,
    PreferenceKey.ManageVvmStatusForStock
  );

  const displayInDoses = allocateIn === AllocateInType.Doses;

  const columnDefinitions: ColumnDescription<
    // unitQuantity field added by UnitQuantity column setter
    DraftStockOutLineFragment & { unitQuantity?: number }
  >[] = [
    [
      'batch',
      {
        accessor: ({ rowData }) => rowData.batch,
      },
    ],
    [
      'expiryDate',
      {
        Cell: ExpiryDateCell,
        width: 100,
      },
    ],
  ];

  // If we have use VVM status, we need to show the VVM status column
  // TODO: But just for vaccines?
  if (
    (prefs?.manageVvmStatusForStock || prefs?.sortByVvmStatusThenExpiry) &&
    item?.isVaccine
  ) {
    columnDefinitions.push({
      key: 'vvmStatus',
      label: 'label.vvm-status',
      accessor: ({ rowData }) => {
        if (!rowData.vvmStatus) return '';
        // TODO: Show unusable VVM status somehow?
        return `${rowData.vvmStatus?.description} (${rowData.vvmStatus?.level})`;
      },
      width: 85,
    });
  }

  if (displayInDoses) {
    columnDefinitions.push({
      key: 'dosesPerUnit',
      label: unit
        ? t('label.doses-per-unit-name', {
            unit,
          })
        : 'label.doses-per-unit',
      width: 80,
      align: ColumnAlign.Right,
      accessor: ({ rowData }) =>
        rowData?.itemVariant?.dosesPerUnit ?? rowData.defaultDosesPerUnit,
    });
  } else {
    columnDefinitions.push(['packSize', { width: 90 }]);
  }

  columnDefinitions.push({
    Cell: NumberCell,
    label: t('label.units-in-stock', {
      unit: pluralisedUnitName,
    }),
    key: 'totalUnits',
    align: ColumnAlign.Right,
    width: 80,
    accessor: ({ rowData }) =>
      (rowData.inStorePacks ?? 0) * (rowData.packSize ?? 1),
  });

  if (displayInDoses) {
    columnDefinitions.push(...getPrescriptionLineDosesColumns(allocate));
  } else {
    columnDefinitions.push(
      {
        Cell: NumberCell,
        label: t('label.units-available', {
          unit: pluralisedUnitName,
        }),
        key: 'availableUnits',
        align: ColumnAlign.Right,
        width: 85,
        accessor: ({ rowData }) =>
          (rowData.availablePacks ?? 0) * (rowData.packSize ?? 1),
      },
      {
        key: 'unitQuantity',
        Cell: UnitQuantityCell,
        width: 100,
        label: t('label.units-issued', { unit: pluralisedUnitName }),
        setter: ({
          id,
          unitQuantity,
        }: Partial<DraftStockOutLineFragment> & {
          id: string;
          // Extra field only in the context of this setter, based on key above
          unitQuantity?: number;
        }) => allocate(id, unitQuantity ?? 0),
        accessor: ({ rowData }) =>
          packsToQuantity(AllocateInType.Units, rowData.numberOfPacks, rowData),
      }
    );
  }

  return useColumns(columnDefinitions, {}, [allocate]);
};

const UnitQuantityCell = (props: CellProps<DraftStockOutLineFragment>) => (
  <NumberInputCell
    {...props}
    max={props.rowData.availablePacks * props.rowData.packSize}
    decimalLimit={2}
    min={0}
    slotProps={{ htmlInput: { sx: { backgroundColor: 'white' } } }}
  />
);
