import React from 'react';
import {
  getInvoiceLocalisationKey,
  getNameValue,
  ItemLedgerFragment,
  useItemLedger,
} from '@openmsupply-client/system';
import { BasicSpinner, NothingHere } from '@common/components';
import {
  DataTable,
  TableProvider,
  useColumns,
  createTableStore,
  Box,
  createQueryParamsStore,
  useTranslation,
  useUrlQueryParams,
  useFormatDateTime,
  ColumnFormat,
  CurrencyCell,
} from '@openmsupply-client/common';
import { getStatusTranslation } from '@openmsupply-client/invoices/src/utils';

const ItemLedgerTable = ({
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
    queryParams: { sortBy, page, first, offset },
  } = useUrlQueryParams();
  const pagination = { page, first, offset };

  const { data, isLoading } = useItemLedger(itemId);
  const { localisedTime } = useFormatDateTime();

  const columns = useColumns<ItemLedgerFragment>(
    [
      {
        key: 'type',
        label: 'label.type',
        accessor: ({ rowData }) =>
          `${t(getInvoiceLocalisationKey(rowData.invoiceType))} #${rowData.invoiceNumber}`,
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
        key: 'quantity',
        label: 'label.unit-quantity',
        sortable: false,
        description: 'description.unit-quantity',
      },

      {
        key: 'balance',
        label: 'label.balance',
        sortable: false,
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
      sortBy,
    },
    [updateSortQuery, sortBy]
  );

  if (isLoading) return <BasicSpinner />;

  return (
    <DataTable
      id="item-ledger-table"
      data={data?.nodes}
      columns={columns}
      pagination={{ ...pagination, total: data?.totalCount ?? 0 }}
      onChangePage={updatePaginationQuery}
      isLoading={isLoading}
      onRowClick={onRowClick}
      noDataElement={<NothingHere body={t('messages.no-ledger')} />}
    />
  );
};

export const ItemLedgerTab = ({
  itemId,
  onRowClick,
}: {
  itemId: string;
  onRowClick: (ledger: ItemLedgerFragment) => void;
}) => (
  <Box justifyContent="center" display="flex" flex={1}>
    <Box flex={1} display="flex">
      <TableProvider
        createStore={createTableStore}
        queryParamsStore={createQueryParamsStore({
          initialSortBy: { key: 'datetime' },
        })}
      >
        <ItemLedgerTable itemId={itemId} onRowClick={onRowClick} />
      </TableProvider>
    </Box>
  </Box>
);
