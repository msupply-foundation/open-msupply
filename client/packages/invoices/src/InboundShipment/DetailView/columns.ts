import {
  getLinesFromRow,
  usePreferences,
  useTranslation,
  ColumnDef,
  ColumnType,
  weightedAverage,
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

  return useMemo((): ColumnDef<InboundLineFragment>[] => {
    return [
      {
        accessorKey: 'item.code',
        header: t('label.code'),
        size: 120,
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
        includeColumn: manageVaccinesInDoses,
        accessorFn: row => (row.item.isVaccine ? row.item.doses : undefined),
      },
      {
        accessorKey: 'numberOfPacks',
        header: t('label.pack-quantity'),
        columnType: ColumnType.Number,
        size: 100,
      },
      {
        id: 'unitQuantity',
        accessorFn: row => row.packSize * row.numberOfPacks,
        header: t('label.unit-quantity'),
        description: t('description.unit-quantity'),
        columnType: ColumnType.Number,
        aggregationFn: 'sum',
        defaultHideOnMobile: true,
        size: 120,
      },
      {
        id: 'doseQuantity',
        accessorFn: row => {
          if (!row.item.isVaccine) return null;
          return row.packSize * row.numberOfPacks * (row.item.doses ?? 1);
        },
        header: t('label.doses'),
        columnType: ColumnType.Number,
        aggregationFn: 'sum',
        defaultHideOnMobile: true,
        includeColumn: manageVaccinesInDoses,
        size: 120,
      },
      {
        id: 'costPricePerUnit',
        accessorFn: row => {
          if (isInboundPlaceholderRow(row)) return undefined;
          return row.costPricePerPack / row.packSize;
        },
        header: t('label.cost-per-unit'),
        columnType: ColumnType.Currency,
        defaultHideOnMobile: true,
        aggregationFn: weightedAverage,
        size: 100,
      },
      {
        id: 'total',
        header: t('label.total'),
        columnType: ColumnType.Currency,
        defaultHideOnMobile: true,
        accessorFn: rowData => {
          if (isInboundPlaceholderRow(rowData)) return null;
          return rowData.costPricePerPack * rowData.numberOfPacks;
        },
        aggregationFn: 'sum',
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
  }, [
    getError,
    manageVaccinesInDoses,
    manageVvmStatusForStock,
    allowTrackingOfStockByDonor,
  ]);
};
