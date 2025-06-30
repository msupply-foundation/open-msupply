import React from 'react';
import {
  getInvoiceLocalisationKey,
  getNameValue,
  ItemLedgerFragment,
  useItemLedger,
} from '@openmsupply-client/system';
import {
  BasicSpinner,
  FilterDefinition,
  FilterMenu,
  GroupFilterDefinition,
  NothingHere,
} from '@common/components';
import {
  DataTable,
  TableProvider,
  useColumns,
  createTableStore,
  Box,
  useTranslation,
  useUrlQueryParams,
  useFormatDateTime,
  ColumnFormat,
  CurrencyCell,
  NumUtils,
  InvoiceNodeType,
  InvoiceNodeStatus,
} from '@openmsupply-client/common';
import { getStatusTranslation } from '@openmsupply-client/invoices/src/utils';

interface ItemLedgerTableProps {
  itemLedgers: {
    ledgers: ItemLedgerFragment[];
    totalCount: number;
  };
  isLoading: boolean;
  onRowClick: (ledger: ItemLedgerFragment) => void;
  queryParams: {
    page: number;
    first: number;
    offset: number;
  };
  updateSortQuery: (sortBy: string, dir: 'asc' | 'desc') => void;
  updatePaginationQuery: (page: number) => void;
}

const ItemLedgerTable = ({
  onRowClick,
  itemLedgers: { ledgers, totalCount },
  isLoading,
  queryParams: { page, first, offset },
  updateSortQuery,
  updatePaginationQuery,
}: ItemLedgerTableProps) => {
  const t = useTranslation();
  const { localisedTime } = useFormatDateTime();
  const pagination = {
    page,
    first,
    offset,
  };

  const columns = useColumns<ItemLedgerFragment>(
    [
      {
        key: 'type',
        label: 'label.type',
        accessor: ({ rowData }) =>
          t(getInvoiceLocalisationKey(rowData.invoiceType)),
        sortable: false,
      },
      {
        key: 'invoiceNumber',
        label: 'label.invoice-number',
        sortable: false,
      },
      {
        key: 'datetime',
        label: 'label.date',
        format: ColumnFormat.Date,
        sortable: false,
      },
      {
        key: 'time',
        label: 'label.time',
        accessor: ({ rowData }) => localisedTime(rowData.datetime),
        sortable: false,
      },
      {
        key: 'name',
        label: 'label.name',
        sortable: false,
        accessor: ({ rowData }) => getNameValue(t, rowData.name),
      },
      {
        key: 'status',
        label: 'label.status',
        sortable: false,
        accessor: ({ rowData }) =>
          t(getStatusTranslation(rowData.invoiceStatus)),
      },
      {
        key: 'expiryDate',
        label: 'label.expiry',
        format: ColumnFormat.Date,
        sortable: false,
      },
      {
        key: 'batch',
        label: 'label.batch',
        sortable: false,
      },
      {
        key: 'packSize',
        label: 'label.pack-size',
        sortable: false,
      },
      {
        key: 'numberOfPacks',
        sortable: false,
        label: 'label.num-packs',
      },
      {
        key: 'movementInUnits',
        label: 'label.change',
        sortable: false,
        description: 'description.unit-quantity',
        accessor: ({ rowData }) => NumUtils.round(rowData.movementInUnits, 2),
      },

      {
        key: 'balance',
        label: 'label.balance',
        sortable: false,
        accessor: ({ rowData }) => NumUtils.round(rowData.balance, 2),
      },
      {
        key: 'costPricePerPack',
        label: 'label.pack-cost-price',
        sortable: false,
        accessor: ({ rowData }) => rowData.costPricePerPack,
        Cell: CurrencyCell,
      },
      {
        key: 'sellPricePerPack',
        label: 'label.pack-sell-price',
        sortable: false,
        accessor: ({ rowData }) => rowData.sellPricePerPack,
        Cell: CurrencyCell,
      },
      {
        key: 'foreignCurrencyPriceBeforeTax',
        label: 'label.total-before-tax',
        sortable: false,
        accessor: ({ rowData }) => rowData.totalBeforeTax,
        Cell: CurrencyCell,
      },
      {
        key: 'reason',
        label: 'label.reason',
        sortable: false,
      },
    ],
    {
      onChangeSortBy: updateSortQuery,
    },
    [updateSortQuery]
  );

  if (isLoading) return <BasicSpinner />;

  return (
    <DataTable
      id="item-ledger-table"
      data={ledgers}
      columns={columns}
      pagination={{ ...pagination, total: totalCount }}
      onChangePage={updatePaginationQuery}
      isLoading={isLoading}
      onRowClick={onRowClick}
      noDataElement={<NothingHere body={t('messages.no-item-ledger')} />}
    />
  );
};

export const ItemLedgerTab = ({
  itemId,
  onRowClick,
}: {
  itemId: string;
  onRowClick: (ledger: ItemLedgerFragment) => void;
}) => {
  const t = useTranslation();
  const {
    updateSortQuery,
    updatePaginationQuery,
    queryParams: { page, first, offset, filterBy },
  } = useUrlQueryParams({
    filters: [
      { key: 'datetime', condition: 'between' },
      { key: 'invoiceType', condition: 'equalTo' },
      { key: 'invoiceStatus', condition: 'equalTo' },
    ],
  });
  const { data, isLoading } = useItemLedger(itemId, {
    first,
    offset,
    filterBy,
  });

  const filters: (FilterDefinition | GroupFilterDefinition)[] = [
    {
      type: 'group',
      name: t('label.datetime'),
      elements: [
        {
          type: 'date',
          name: t('label.from-datetime'),
          urlParameter: 'datetime',
          range: 'from',
          isDefault: true,
        },
        {
          type: 'date',
          name: t('label.to-datetime'),
          urlParameter: 'datetime',
          range: 'to',
          isDefault: true,
        },
      ],
    },
    {
      type: 'enum',
      name: t('label.type'),
      urlParameter: 'invoiceType',
      options: [
        ...Object.values(InvoiceNodeType).map(type => ({
          label: t(getInvoiceLocalisationKey(type)),
          value: type,
        })),
      ],
    },
    {
      type: 'enum',
      name: t('label.status'),
      urlParameter: 'invoiceStatus',
      options: [
        ...Object.values(InvoiceNodeStatus)
          .filter(
            status =>
              status !== InvoiceNodeStatus.New &&
              status !== InvoiceNodeStatus.Allocated
          )
          .map(status => ({
            label: t(getStatusTranslation(status)),
            value: status,
          })),
      ],
    },
  ];

  return (
    <Box display="flex" flexDirection="column" flex={1} mt={1}>
      <Box display="flex" ml={2} mb={1}>
        <FilterMenu filters={filters} />
      </Box>
      <Box
        display="flex"
        flex={1}
        sx={{
          boxShadow: theme => theme.shadows[4],
        }}
      >
        <TableProvider createStore={createTableStore}>
          <ItemLedgerTable
            itemLedgers={data ?? { ledgers: [], totalCount: 0 }}
            isLoading={isLoading}
            onRowClick={onRowClick}
            queryParams={{ page, first, offset }}
            updateSortQuery={updateSortQuery}
            updatePaginationQuery={updatePaginationQuery}
          />
        </TableProvider>
      </Box>
    </Box>
  );
};
