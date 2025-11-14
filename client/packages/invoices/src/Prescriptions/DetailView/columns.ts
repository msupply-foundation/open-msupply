import {
  useTranslation,
  useAuthContext,
  usePreferences,
  ColumnDef,
  ColumnType,
  Groupable,
  ArrayUtils,
} from '@openmsupply-client/common';
import { PrescriptionLineFragment } from '../api/operations.generated';
import { useMemo } from 'react';
import { isPrescriptionPlaceholderRow } from '../../utils';

export const usePrescriptionColumn = () => {
  const t = useTranslation();
  const { manageVaccinesInDoses } = usePreferences();
  const { store: { preferences } = {} } = useAuthContext();
  const hasPrescribedQty = preferences?.editPrescribedQuantityOnPrescription;

  return useMemo((): ColumnDef<Groupable<PrescriptionLineFragment>>[] => {
    return [
      {
        accessorKey: 'item.code',
        header: t('label.code'),
        size: 120,
        pin: 'left',
        enableColumnFilter: true,
        enableSorting: true,
      },
      {
        accessorKey: 'note',
        header: t('label.comment'),
        columnType: ColumnType.Comment,
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
        enableColumnFilter: true,
        defaultHideOnMobile: true,
      },
      {
        id: 'expiryDate',
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
        enableColumnFilter: true,
        enableSorting: true,
        defaultHideOnMobile: true,
        size: 100,
      },
      {
        id: 'itemUnit',
        accessorKey: 'item.unitName',
        header: t('label.unit-name'),
        enableColumnFilter: true,
        filterVariant: 'select',
        defaultHideOnMobile: true,
      },
      {
        accessorKey: 'packSize',
        header: t('label.pack-size'),
        columnType: ColumnType.Number,
        defaultHideOnMobile: true,
        enableSorting: true,
        size: 100,
      },
      {
        id: 'itemDoses',
        header: t('label.doses-per-unit'),
        columnType: ColumnType.Number,
        defaultHideOnMobile: true,
        accessorFn: row => (row.item.isVaccine ? row.item.doses : undefined),
        includeColumn: manageVaccinesInDoses,
      },
      {
        id: 'unitQuantity',
        header: t('label.unit-quantity'),
        description: t('description.unit-quantity'),
        columnType: ColumnType.Number,
        defaultHideOnMobile: true,
        accessorFn: row => {
          if ('subRows' in row)
            return ArrayUtils.getUnitQuantity(row.subRows ?? []);

          return row.packSize * row.numberOfPacks;
        },
        size: 120,
      },
      {
        id: 'doseQuantity',
        header: t('label.doses'),
        columnType: ColumnType.Number,
        defaultHideOnMobile: true,
        accessorFn: row => {
          if (!row.item.isVaccine) return null;
          if ('subRows' in row)
            return (
              ArrayUtils.getUnitQuantity(row.subRows ?? []) *
              (row.item.doses ?? 1)
            );

          return row.packSize * row.numberOfPacks * (row.item.doses ?? 1);
        },
        size: 120,
        includeColumn: manageVaccinesInDoses,
      },
      {
        accessorKey: 'prescribedQuantity',
        header: t('label.prescribed-quantity'),
        columnType: ColumnType.Number,
        enableSorting: true,
        size: 120,
        includeColumn: hasPrescribedQty,
      },
      {
        accessorKey: 'numberOfPacks',
        header: t('label.pack-quantity'),
        columnType: ColumnType.Number,
        enableSorting: true,
        size: 100,
        accessorFn: row => {
          if ('subRows' in row)
            return ArrayUtils.getSum(row.subRows ?? [], 'numberOfPacks');

          return row.numberOfPacks;
        },
      },
      {
        id: 'sellPricePerUnit',
        header: t('label.unit-price'),
        columnType: ColumnType.Currency,
        defaultHideOnMobile: true,
        accessorFn: rowData => {
          if ('subRows' in rowData) {
            return ArrayUtils.getAveragePrice(
              rowData.subRows ?? [],
              'sellPricePerPack'
            );
          } else {
            if (isPrescriptionPlaceholderRow(rowData)) return undefined;
            return (rowData.sellPricePerPack ?? 0) / rowData.packSize;
          }
        },
        size: 100,
      },
      {
        id: 'lineTotal',
        header: t('label.line-total'),
        columnType: ColumnType.Currency,
        defaultHideOnMobile: true,
        accessorFn: rowData => {
          if ('subRows' in rowData) {
            return Object.values(rowData.subRows ?? []).reduce(
              (sum, batch) =>
                sum + batch.sellPricePerPack * batch.numberOfPacks,
              0
            );
          } else {
            if (isPrescriptionPlaceholderRow(rowData)) return '';

            return (rowData.sellPricePerPack ?? 0) * rowData.numberOfPacks;
          }
        },
        size: 120,
      },
      {
        id: 'totalCostPrice',
        header: t('label.purchase-cost-price'),
        columnType: ColumnType.Currency,
        defaultHideOnMobile: true,
        accessorFn: rowData => {
          if ('subRows' in rowData) {
            return Object.values(rowData.subRows ?? []).reduce(
              (sum, batch) =>
                sum + batch.costPricePerPack * batch.numberOfPacks,
              0
            );
          } else {
            if (isPrescriptionPlaceholderRow(rowData)) return '';

            return (rowData.costPricePerPack ?? 0) * rowData.numberOfPacks;
          }
        },
        size: 120,
      },
    ];
  }, [manageVaccinesInDoses, hasPrescribedQty]);
};
