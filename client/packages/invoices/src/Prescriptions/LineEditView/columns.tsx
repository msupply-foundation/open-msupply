import React from 'react';
import {
  CellProps,
  ColumnAlign,
  ColumnDescription,
  ExpiryDateCell,
  Formatter,
  NumberCell,
  NumberInputCell,
  useColumns,
  useIntlUtils,
  usePreferences,
  useTranslation,
  VvmStatusCell,
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

  const { sortByVvmStatusThenExpiry, manageVvmStatusForStock } =
    usePreferences();

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
    (manageVvmStatusForStock || sortByVvmStatusThenExpiry) &&
    item?.isVaccine
  ) {
    columnDefinitions.push({
      key: 'vvmStatus',
      label: 'label.vvm-status',
      Cell: VvmStatusCell,
      accessor: ({ rowData }) => rowData?.vvmStatus,
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
      accessor: ({ rowData }) => rowData.dosesPerUnit,
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
