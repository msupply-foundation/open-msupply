import { useCallback, useMemo } from 'react';
import {
  useTranslation,
  usePreferences,
  ColumnDef,
  ColumnType,
  UnitsAndDosesCell,
} from '@openmsupply-client/common';
import { StocktakeLineFragment } from '../api';
import { StocktakeLineError, useStocktakeLineErrorContext } from '../context';

export const useStocktakeColumns = () => {
  const t = useTranslation();
  const { manageVaccinesInDoses, allowTrackingOfStockByDonor } =
    usePreferences();
  const { errors } = useStocktakeLineErrorContext();

  const getIsError = useCallback(
    (
      errorType: StocktakeLineError['__typename'],
      row: StocktakeLineFragment
    ) => {
      return errors?.[row.id]?.__typename === errorType;
    },
    [errors]
  );

  const columns = useMemo(() => {
    const cols: ColumnDef<StocktakeLineFragment>[] = [
      {
        accessorKey: 'item.code',
        header: t('label.code'),
        pin: 'left',
        size: 120,
        enableColumnFilter: true,
        enableSorting: true,
      },
      {
        accessorKey: 'itemName',
        header: t('label.name'),
        size: 350,
        enableColumnFilter: true,
        enableSorting: true,
      },
      {
        accessorKey: 'batch',
        header: t('label.batch'),
        size: 110,
        enableSorting: true,
        defaultHideOnMobile: true,
      },
      {
        id: 'expiryDate',
        // expiryDate from backend is a string - use accessorFn to convert to Date object for sort and filtering
        accessorFn: row => (row.expiryDate ? new Date(row.expiryDate) : null),
        header: t('label.expiry-date'),
        size: 110,
        columnType: ColumnType.Date,
        defaultHideOnMobile: true,
        enableColumnFilter: true,
        enableSorting: true,
      },
      {
        id: 'locationCode',
        accessorFn: row => row.location?.code ?? '',
        header: t('label.location'),
        size: 100,
        defaultHideOnMobile: true,
      },
      {
        id: 'itemUnit',
        accessorKey: 'item.unitName',
        header: t('label.unit-name'),
        size: 100,
        enableSorting: true,
        defaultHideOnMobile: true,
      },
      {
        accessorKey: 'packSize',
        header: t('label.pack-size'),
        columnType: ColumnType.Number,
        defaultHideOnMobile: true,
      },
      {
        id: 'itemDoses',
        header: t('label.doses-per-unit'),
        columnType: ColumnType.Number,
        defaultHideOnMobile: true,
        includeColumn: manageVaccinesInDoses,
        accessorFn: row => (row.item.isVaccine ? row.item.doses : undefined),
      },
      {
        accessorKey: 'snapshotNumberOfPacks',
        header: t('label.snapshot-num-of-packs'),
        description: t('description.snapshot-num-of-packs'),
        columnType: ColumnType.Number,
        enableSorting: true,
        aggregationFn: 'sum',
        getIsError: row =>
          getIsError('SnapshotCountCurrentCountMismatchLine', row),
      },
      {
        accessorKey: 'countedNumberOfPacks',
        header: t('label.counted-num-of-packs'),
        description: t('description.counted-num-of-packs'),
        columnType: ColumnType.Number,
        enableSorting: true,
        aggregationFn: 'sum',
        getIsError: row => getIsError('StockLineReducedBelowZero', row),
      },
      {
        id: 'difference',
        accessorFn: row =>
          (row.countedNumberOfPacks ?? row.snapshotNumberOfPacks) -
          row.snapshotNumberOfPacks,
        header: t('label.difference'),
        columnType: ColumnType.Number,
        aggregationFn: 'sum',
        Cell: UnitsAndDosesCell,
      },
      {
        id: 'reason',
        header: t('label.reason'),
        accessorFn: row => row.reasonOption?.reason,
        enableSorting: true,
      },
      {
        id: 'donor',
        header: t('label.donor'),
        enableSorting: true,
        accessorFn: row => row.donorName,
        includeColumn: allowTrackingOfStockByDonor,
        defaultHideOnMobile: true,
      },
      {
        accessorKey: 'comment',
        header: t('label.comment'),
        columnType: ColumnType.Comment,
      },
    ];
    return cols;
  }, [t, manageVaccinesInDoses, allowTrackingOfStockByDonor, getIsError]);

  return columns;
};
