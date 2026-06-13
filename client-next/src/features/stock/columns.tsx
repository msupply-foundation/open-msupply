import { createColumnHelper } from '@tanstack/react-table';
import { format } from 'date-fns';
import type { StockLineRowFragment } from './stock.generated';

const helper = createColumnHelper<StockLineRowFragment>();

const fmtDate = (value: string | null | undefined): string =>
  value ? format(new Date(value), 'dd/MM/yyyy') : '';

export const stockColumns = [
  helper.accessor(row => row.item.code, { id: 'code', header: 'Code' }),
  helper.accessor(row => row.item.name, { id: 'name', header: 'Name' }),
  helper.accessor('batch', {
    id: 'batch',
    header: 'Batch',
    cell: c => c.getValue() ?? '',
  }),
  helper.accessor('expiryDate', {
    id: 'expiryDate',
    header: 'Expiry',
    cell: c => fmtDate(c.getValue()),
  }),
  helper.accessor('packSize', { id: 'packSize', header: 'Pack size' }),
  helper.accessor('totalNumberOfPacks', {
    id: 'totalNumberOfPacks',
    header: 'Packs',
  }),
  helper.accessor('locationName', {
    id: 'location',
    header: 'Location',
    enableSorting: false,
    cell: c => c.getValue() ?? '',
  }),
  helper.accessor('supplierName', {
    id: 'supplierName',
    header: 'Supplier',
    cell: c => c.getValue() ?? '',
  }),
];
