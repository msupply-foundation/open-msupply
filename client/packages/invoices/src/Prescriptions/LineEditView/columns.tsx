import React, { useMemo } from 'react';
import {
  ColumnDef,
  ColumnType,
  useTranslation,
  Formatter,
  usePreferences,
  useIntlUtils,
  CheckCell,
} from '@openmsupply-client/common';
import {
  DraftItem,
  DraftStockOutLineFragment,
  AllocateInType,
  packsToQuantity,
} from '../../StockOut';
import { NumberInputCell } from '@openmsupply-client/common/src/ui/layout/tables/material-react-table/components/NumberInputCell';
import { ExpiryDateCell } from '@openmsupply-client/common/src/ui/layout/tables/material-react-table/components/ExpiryDateCell';

export const usePrescriptionLineEditColumns = ({
  allocate,
  item,
  allocateIn,
  getIsDisabled,
}: {
  allocate: (key: string, value: number) => number;
  item: DraftItem | null;
  allocateIn: AllocateInType;
  getIsDisabled: (row: DraftStockOutLineFragment) => boolean;
}): ColumnDef<DraftStockOutLineFragment>[] => {
  const t = useTranslation();
  const { getPlural } = useIntlUtils();

  const unit = Formatter.sentenceCase(item?.unitName ?? t('label.unit'));
  const { sortByVvmStatusThenExpiry, manageVvmStatusForStock } =
    usePreferences();
  const hasVvmStatusesEnabled =
    manageVvmStatusForStock && sortByVvmStatusThenExpiry;
  const pluralisedUnitName = getPlural(unit, 2);
  const displayInDoses = allocateIn === AllocateInType.Doses;

  return useMemo((): ColumnDef<DraftStockOutLineFragment>[] => {
    return [
      {
        accessorKey: 'batch',
        header: t('label.batch'),
        size: 100,
      },
      {
        accessorKey: 'expiryDate',
        header: t('label.expiry'),
        Cell: ExpiryDateCell,
        size: 100,
      },
      {
        id: 'vvmStatus',
        header: t('label.vvm-status'),
        size: 150,
        accessorFn: row => row.vvmStatus?.description || '',
        includeColumn: hasVvmStatusesEnabled && item?.isVaccine,
      },
      {
        accessorKey: 'dosesPerUnit  ',
        header: unit
          ? t('label.doses-per-unit-name', {
              unit,
            })
          : 'label.doses-per-unit',
        size: 80,
        includeColumn: item?.isVaccine && displayInDoses,
      },
      {
        accessorKey: 'packSize',
        header: t('label.pack-size'),
        columnType: ColumnType.Number,
        size: 90,
        includeColumn: !item?.isVaccine,
      },
      {
        accessorKey: 'totalUnits',
        header: t('label.units-in-stock', {
          unit: pluralisedUnitName,
        }),
        accessorFn: row => (row.inStorePacks ?? 0) * (row.packSize ?? 1),
        size: 120,
        columnType: ColumnType.Number,
      },
      {
        accessorKey: 'availableUnits',
        header: t('label.units-available', { unit: pluralisedUnitName }),
        accessorFn: row => (row.availablePacks ?? 0) * (row.packSize ?? 1),
        columnType: ColumnType.Number,
        size: 120,
      },
      {
        accessorKey: 'unitQuantity',
        header: t('label.units-issued', { unit: pluralisedUnitName }),
        size: 120,
        columnType: ColumnType.Number,
        accessorFn: row =>
          packsToQuantity(AllocateInType.Units, row.numberOfPacks, row),
        Cell: ({ cell, row }) => (
          <NumberInputCell
            max={row.original.availablePacks * row.original.packSize}
            cell={cell}
            updateFn={(value: number) => allocate(row.original.id, value)}
            sx={{
              '& .MuiInputBase-input': { backgroundColor: 'background.paper' },
            }}
            disabled={getIsDisabled(row.original)}
          />
        ),
      },
      {
        id: 'onHold',
        header: t('label.on-hold'),
        size: 30,
        defaultHideOnMobile: true,
        accessorFn: row => row.stockLineOnHold || row.location?.onHold,
        Cell: CheckCell,
      },
    ];
  }, [unit, allocate, getIsDisabled]);
};
