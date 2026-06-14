import { useMemo } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { format } from 'date-fns';
import { useTranslation } from '@/intl';
import type { StockLineRowFragment } from './stock.generated';

const helper = createColumnHelper<StockLineRowFragment>();

const fmtDate = (value: string | null | undefined): string =>
  value ? format(new Date(value), 'dd/MM/yyyy') : '';

export function useStockColumns() {
  const { t } = useTranslation();
  return useMemo(
    () => [
      helper.accessor(row => row.item.code, { id: 'code', header: t('label.code') }),
      helper.accessor(row => row.item.name, { id: 'name', header: t('label.name') }),
      helper.accessor('batch', {
        id: 'batch',
        header: t('label.batch'),
        cell: c => c.getValue() ?? '',
      }),
      helper.accessor('expiryDate', {
        id: 'expiryDate',
        header: t('label.expiry'),
        cell: c => fmtDate(c.getValue()),
      }),
      helper.accessor('packSize', { id: 'packSize', header: t('label.pack-size') }),
      helper.accessor('totalNumberOfPacks', {
        id: 'totalNumberOfPacks',
        header: t('label.packs'),
      }),
      helper.accessor('locationName', {
        id: 'location',
        header: t('label.location'),
        enableSorting: false,
        cell: c => c.getValue() ?? '',
      }),
      helper.accessor('supplierName', {
        id: 'supplierName',
        header: t('label.supplier'),
        cell: c => c.getValue() ?? '',
      }),
    ],
    [t],
  );
}
