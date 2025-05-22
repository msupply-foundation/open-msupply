import React from 'react';
import {
  CellProps,
  ColumnAlign,
  ColumnDescription,
  ExpiryDateCell,
  Formatter,
  getDosesPerUnitColumn,
  NumberCell,
  NumberInputCell,
  PreferenceKey,
  useColumns,
  useIntlUtils,
  usePreference,
  useTranslation,
} from '@openmsupply-client/common';
import { getPrescriptionLineDosesColumns } from './columnsDoses';
import { AllocateIn } from '../../Allocation/useAllocationContext';
import { DraftItem } from '../..';
import { DraftStockOutLineFragment } from '../../OutboundShipment/api/operations.generated';

export const usePrescriptionLineEditColumns = ({
  allocate,
  item,
  allocateIn,
}: {
  allocate: (key: string, value: number) => number;
  item: DraftItem | null;
  allocateIn: AllocateIn;
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

  const displayInDoses = allocateIn === AllocateIn.Doses;

  const columnDefinitions: ColumnDescription<DraftStockOutLineFragment>[] = [
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
  if (prefs?.manageVvmStatusForStock || prefs?.sortByVvmStatusThenExpiry) {
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
    columnDefinitions.push(getDosesPerUnitColumn(t, pluralisedUnitName));
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
      [
        'numberOfPacks', // TODO: This should be in units, not packs
        {
          Cell: UnitQuantityCell,
          width: 100,
          label: t('label.units-issued', { unit: pluralisedUnitName }),
          setter: ({ id, numberOfPacks }) => allocate(id, numberOfPacks ?? 0),
        },
      ]
    );
  }

  return useColumns(columnDefinitions, {}, [allocate]);
};

const UnitQuantityCell = (props: CellProps<DraftStockOutLineFragment>) => (
  <NumberInputCell
    {...props}
    max={props.rowData.availablePacks}
    decimalLimit={2}
    min={0}
  />
);
