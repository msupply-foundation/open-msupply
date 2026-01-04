import React from 'react';
import {
  getInvoiceLocalisationKey,
  getNameValue,
  ItemLedgerFragment,
  useItemLedger,
} from '@openmsupply-client/system';
import {
  MaterialTable,
  ColumnDef,
  ColumnType,
  usePaginatedMaterialTable,
  useTranslation,
  useUrlQueryParams,
  useFormatDateTime,
  InvoiceNodeStatus,
  InvoiceNodeType,
  NothingHere,
} from '@openmsupply-client/common';
import { getInvoiceStatusTranslator } from '@openmsupply-client/invoices/';

interface ItemLedgerTableProps {
  itemLedgers: {
    ledgers: ItemLedgerFragment[];
    totalCount: number;
  };
  isLoading: boolean;
  onRowClick: (ledger: ItemLedgerFragment) => void;
}

const ItemLedgerTable = ({
  onRowClick,
  itemLedgers: { ledgers, totalCount },
  isLoading,
}: ItemLedgerTableProps) => {
  const t = useTranslation();
  const { localisedTime } = useFormatDateTime();

  const columns = React.useMemo(
    (): ColumnDef<ItemLedgerFragment>[] => [
      {
        accessorKey: 'invoiceType',
        header: t('label.type'),
        Cell: ({ row }) =>
          t(getInvoiceLocalisationKey(row.original.invoiceType)),
        pin: 'left',
        enableColumnFilter: true,
        filterVariant: 'select',
        filterSelectOptions: Object.values(InvoiceNodeType).map(type => ({
          value: type,
          label: t(getInvoiceLocalisationKey(type)),
        })),
      },
      {
        accessorKey: 'invoiceNumber',
        header: t('label.invoice-number'),
        columnType: ColumnType.Number,
        size: 80,
      },
      {
        accessorKey: 'datetime',
        header: t('label.date'),
        columnType: ColumnType.Date,
        size: 100,
        enableColumnFilter: true,
      },
      {
        id: 'time',
        header: t('label.time'),
        accessorFn: row => localisedTime(row.datetime),
        size: 80,
      },
      {
        id: 'name',
        header: t('label.name'),
        accessorFn: row => getNameValue(t, row.name),
      },
      {
        id: 'invoiceStatus',
        header: t('label.status'),
        accessorFn: row => getInvoiceStatusTranslator(t)(row.invoiceStatus),
        filterVariant: 'select',
        filterSelectOptions: Object.values(InvoiceNodeStatus).map(status => ({
          value: status,
          label: getInvoiceStatusTranslator(t)(status),
        })),
        enableColumnFilter: true,
      },
      {
        accessorKey: 'expiryDate',
        header: t('label.expiry'),
        columnType: ColumnType.Date,
        size: 100,
      },
      {
        accessorKey: 'batch',
        header: t('label.batch'),
        size: 120,
      },
      {
        accessorKey: 'packSize',
        header: t('label.pack-size'),
        columnType: ColumnType.Number,
        size: 80,
      },
      {
        accessorKey: 'numberOfPacks',
        header: t('label.num-packs'),
        columnType: ColumnType.Number,
      },
      {
        accessorKey: 'movementInUnits',
        header: t('label.change'),
        columnType: ColumnType.Number,
      },
      {
        accessorKey: 'balance',
        header: t('label.balance'),
        columnType: ColumnType.Number,
      },
      {
        accessorKey: 'costPricePerPack',
        header: t('label.pack-cost-price'),
        columnType: ColumnType.Currency,
      },
      {
        accessorKey: 'sellPricePerPack',
        header: t('label.pack-sell-price'),
        columnType: ColumnType.Currency,
      },
      {
        accessorKey: 'totalBeforeTax',
        header: t('label.total-before-tax'),
        columnType: ColumnType.Currency,
      },
      {
        accessorKey: 'reason',
        header: t('label.reason'),
      },
    ],
    [localisedTime]
  );

  const { table } = usePaginatedMaterialTable<ItemLedgerFragment>({
    tableId: 'item-ledger-table',
    data: ledgers,
    columns,
    isLoading,
    totalCount,
    onRowClick: row => onRowClick(row),
    noDataElement: <NothingHere body={t('messages.no-item-ledger')} />,
    enableRowSelection: false,
  });

  return <MaterialTable table={table} />;
};

export const ItemLedgerTab = ({
  itemId,
  onRowClick,
}: {
  itemId: string;
  onRowClick: (ledger: ItemLedgerFragment) => void;
}) => {
  const {
    queryParams: { first, offset, filterBy },
  } = useUrlQueryParams({
    filters: [
      { key: 'datetime', condition: 'between' },
      { key: 'invoiceType', condition: 'equalTo' },
      { key: 'invoiceStatus', condition: 'equalTo' },
    ],
  });
  const { data, isFetching } = useItemLedger(itemId, {
    first,
    offset,
    filterBy,
  });

  return (
    <ItemLedgerTable
      itemLedgers={data ?? { ledgers: [], totalCount: 0 }}
      isLoading={isFetching}
      onRowClick={onRowClick}
    />
  );
};
