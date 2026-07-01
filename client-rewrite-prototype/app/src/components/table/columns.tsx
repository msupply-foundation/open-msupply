import type { ColumnDef } from '@tanstack/react-table';
import { MessageSquareIcon } from '@/components/icons';
import type { OutboundShipmentRow } from '@/mocks/outboundShipments';
import {
  CommentCell,
  CurrencyCell,
  DateCell,
  NameColourCell,
  NumericCell,
  StatusCell,
  TextWithTooltipCell,
} from './cells';
import './tableTypes'; // registers the ColumnMeta augmentation

/*
 * Outbound-shipment list columns — the exact real column set
 * (client/.../OutboundShipment/ListView/ListView.tsx), so this table is a
 * like-for-like port, not an invented demo. Accessor keys (incl. the nested
 * `pricing.totalAfterTax` dot-path) match the GraphQL InvoiceNode shape, so a
 * live query can replace the mock with no column changes.
 */
export const outboundColumns: ColumnDef<OutboundShipmentRow>[] = [
  {
    id: 'otherPartyName',
    accessorKey: 'otherPartyName',
    header: 'Name',
    size: 320,
    minSize: 140,
    filterFn: 'includesString',
    cell: ({ row }) => (
      <NameColourCell
        name={row.original.otherPartyName}
        colour={row.original.colour}
      />
    ),
    meta: { align: 'start', label: 'Name' },
  },
  {
    id: 'status',
    accessorKey: 'status',
    header: 'Status',
    size: 150,
    // Multi-select: the filter value is an array of status enums; keep the row
    // when its status is one of them (empty array = no filter).
    filterFn: (row, columnId, filterValue: string[]) =>
      !filterValue?.length || filterValue.includes(row.getValue<string>(columnId)),
    cell: ({ row }) => <StatusCell status={row.original.status} />,
    meta: { align: 'start', label: 'Status' },
  },
  {
    id: 'invoiceNumber',
    accessorKey: 'invoiceNumber',
    header: 'Number',
    size: 120,
    filterFn: 'includesString',
    cell: ({ getValue }) => (
      <NumericCell value={getValue<number>()} decimalLimit={0} />
    ),
    meta: { align: 'end', label: 'Number' },
  },
  {
    id: 'createdDatetime',
    accessorKey: 'createdDatetime',
    header: 'Created',
    size: 150,
    cell: ({ getValue }) => <DateCell value={getValue<string>()} />,
    meta: { align: 'end', label: 'Created' },
  },
  {
    id: 'theirReference',
    accessorKey: 'theirReference',
    header: 'Reference',
    size: 170,
    enableSorting: false,
    filterFn: 'includesString',
    cell: ({ getValue }) => (
      <TextWithTooltipCell value={getValue<string | null>()} />
    ),
    meta: { align: 'start', label: 'Reference' },
  },
  {
    id: 'comment',
    accessorKey: 'comment',
    header: () => <MessageSquareIcon aria-label="Comment" />,
    size: 56,
    enableSorting: false,
    enableResizing: false,
    cell: ({ getValue }) => <CommentCell comment={getValue<string | null>()} />,
    meta: { align: 'center', label: 'Comment' },
  },
  {
    id: 'total',
    accessorKey: 'pricing.totalAfterTax',
    header: 'Total',
    size: 130,
    enableSorting: false,
    cell: ({ getValue }) => <CurrencyCell value={getValue<number>()} />,
    meta: { align: 'end', label: 'Total' },
  },
];
