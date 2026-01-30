import {
  ArrayUtils,
  getLinesFromRow,
  usePreferences,
  useTranslation,
  ColumnDef,
  Groupable,
  ColumnType,
} from '@openmsupply-client/common';
import { useInboundShipmentLineErrorContext } from '../context/inboundShipmentLineError';
import { useMemo } from 'react';
import { isInboundPlaceholderRow } from '../../utils';
import { InboundLineFragment } from '../api';

export const useInboundShipmentColumns = () => {
  const t = useTranslation();
  const {
    manageVaccinesInDoses,
    allowTrackingOfStockByDonor,
    manageVvmStatusForStock,
  } = usePreferences();
  const { getError } = useInboundShipmentLineErrorContext();

  return useMemo((): ColumnDef<Groupable<InboundLineFragment>>[] => {
    return [
      {
        accessorKey: 'item.code',
        header: t('label.code'),
        size: 90,
        pin: 'left',
        enableColumnFilter: true,
        enableSorting: true,
        getIsError: row =>
          getLinesFromRow(row).some(
            r => getError(r)?.__typename === 'LineLinkedToTransferredInvoice'
          ),
      },
      {
        accessorKey: 'comment',
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
        size: 100,
        enableColumnFilter: true,
        defaultHideOnMobile: true,
      },
      {
        id: 'expiryDate',
        accessorFn: row => (row.expiryDate ? new Date(row.expiryDate) : null),
        header: t('label.expiry-date'),
        columnType: ColumnType.Date,
        defaultHideOnMobile: true,
        size: 120,
        enableColumnFilter: true,
        enableSorting: true,
      },
      {
        id: 'vvmStatus',
        accessorFn: row => row.vvmStatus?.description ?? '',
        header: t('label.vvm-status'),
        includeColumn: manageVvmStatusForStock,
        defaultHideOnMobile: true,
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        id: 'locationCode',
        accessorFn: row => row.location?.code ?? '',
        header: t('label.location'),
        enableColumnFilter: true,
        enableSorting: true,
        defaultHideOnMobile: true,
      },
      {
        id: 'itemUnit',
        accessorKey: 'item.unitName',
        header: t('label.unit-name'),
        size: 100,
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
        size: 90,
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
        accessorKey: 'numberOfPacks',
        header: t('label.pack-quantity'),
        columnType: ColumnType.Number,
        accessorFn: row => {
          if ('subRows' in row)
            return ArrayUtils.getSum(row.subRows ?? [], 'numberOfPacks');

          return row.numberOfPacks;
        },
        size: 100,
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
        includeColumn: manageVaccinesInDoses,
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
      },
      {
        id: 'costPricePerUnit',
        header: t('label.cost-per-unit'),
        columnType: ColumnType.Currency,
        defaultHideOnMobile: true,
        accessorFn: rowData => {
          if ('subRows' in rowData) {
            return ArrayUtils.getAveragePrice(
              rowData.subRows ?? [],
              'costPricePerPack'
            );
          } else {
            if (isInboundPlaceholderRow(rowData)) return undefined;
            return (rowData.costPricePerPack ?? 0) / rowData.packSize;
          }
        },
        size: 100,
      },
      {
        id: 'total',
        header: t('label.total'),
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
            if (isInboundPlaceholderRow(rowData)) return '';

            const x = rowData.costPricePerPack * rowData.numberOfPacks;
            return x;
          }
        },
        size: 120,
      },
      {
        id: 'donorName',
        header: t('label.donor'),
        defaultHideOnMobile: true,
        includeColumn: allowTrackingOfStockByDonor,
        accessorFn: row => (row.donor ? row.donor.name : ''),
      },
      {
        id: 'campaign',
        header: t('label.campaign'),
        defaultHideOnMobile: true,
        accessorFn: row => row.campaign?.name ?? row.program?.name ?? '',
      },
    ];
  }, [t, manageVvmStatusForStock, manageVaccinesInDoses, allowTrackingOfStockByDonor, getError]);
};
