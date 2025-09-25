import React, { useMemo } from 'react';
import {
  useTranslation,
  usePreferences,
  ColumnDef,
  Groupable,
  ColumnType,
  UnitsAndDosesCell,
} from '@openmsupply-client/common';
import { StocktakeLineFragment } from '../api';

export const useStocktakeColumns = () => {
  const t = useTranslation();
  const { manageVaccinesInDoses, allowTrackingOfStockByDonor } =
    usePreferences();

  const columns = useMemo(() => {
    const cols: ColumnDef<Groupable<StocktakeLineFragment>>[] = [
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
        size: 400,
        enableColumnFilter: true,
        enableSorting: true,
      },
      {
        accessorKey: 'batch',
        header: t('label.batch'),
        enableSorting: true,
        defaultHideOnMobile: true,
      },
      {
        id: 'expiryDate',
        // expiryDate from backend is a string - use accessorFn to convert to Date object for sort and filtering
        accessorFn: row => (row.expiryDate ? new Date(row.expiryDate) : null),
        header: t('label.expiry-date'),
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
        // todo: error
        // getIsError: row =>
        // getLinesFromRow(row).some(
        //   r =>
        //     getError(r)?.__typename === 'SnapshotCountCurrentCountMismatchLine'
        // ),
        id: 'snapshotNumberOfPacks',
        header: t('label.snapshot-num-of-packs'),
        description: t('description.snapshot-num-of-packs'),
        columnType: ColumnType.Number,
        enableSorting: true,
        accessorFn: row => {
          if (row.subRows)
            return row.subRows.reduce(
              (total, line) => total + line.snapshotNumberOfPacks,
              0
            );

          return row.snapshotNumberOfPacks;
        },
      },
      {
        // todo: error
        //   getIsError: row =>
        // getLinesFromRow(row).some(
        //   r => getError(r)?.__typename === 'StockLineReducedBelowZero'
        // ),
        id: 'countedNumberOfPacks',
        header: t('label.counted-num-of-packs'),
        description: t('description.counted-num-of-packs'),
        columnType: ColumnType.Number,
        enableSorting: true,
        accessorFn: row => {
          if (row.subRows) {
            // return null if no subRows have a countedNumberOfPacks, else sum
            return row.subRows.reduce<number | null>((total, line) => {
              if (line.countedNumberOfPacks === null) return total;
              return (total ?? 0) + (line.countedNumberOfPacks ?? 0);
            }, null);
          }

          return row.countedNumberOfPacks;
        },
      },
      {
        id: 'difference',
        header: t('label.difference'),
        columnType: ColumnType.Number,
        Cell: ({ cell, row }) => (
          <UnitsAndDosesCell cell={cell} item={row.original.item} />
        ),
        accessorFn: row => {
          if (row.subRows) {
            return row.subRows.reduce((total, line) => {
              const difference =
                (line.countedNumberOfPacks ?? line.snapshotNumberOfPacks) -
                line.snapshotNumberOfPacks;
              return total + difference;
            }, 0);
          }
          return (
            (row.countedNumberOfPacks ?? row.snapshotNumberOfPacks) -
            row.snapshotNumberOfPacks
          );
        },
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
  }, []);

  return columns;
};
