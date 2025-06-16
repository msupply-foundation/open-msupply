import React, { FC, useEffect } from 'react';
import {
  useNavigate,
  DataTable,
  useColumns,
  getNameAndColorColumn,
  TableProvider,
  createTableStore,
  useTranslation,
  InvoiceNodeStatus,
  useTableStore,
  NothingHere,
  useToggle,
  useUrlQueryParams,
  ColumnFormat,
  GenericColumnKey,
  getCommentPopoverColumn,
  PurchaseOrderNodeStatus,
} from '@openmsupply-client/common';
import { usePurchaseOrderList } from '../api';
import {
  PurchaseOrderFragment,
  PurchaseOrderRowFragment,
} from '../api/operations.generated';
import { Toolbar } from './Toolbar';
import { AppBarButtons } from './AppBarButtons';
import { Footer } from './Footer';
import { getStatusTranslator } from '../utils';

const ListView: FC = () => {
  const t = useTranslation();
  const {
    updateSortQuery,
    updatePaginationQuery,
    filter,
    queryParams: { page, first, offset, sortBy, filterBy },
  } = useUrlQueryParams({
    // initialSort: { key: 'prescriptionDatetime', dir: 'desc' },
    // filters: [
    //   { key: 'otherPartyName' },
    //   { key: 'theirReference' },
    //   { key: 'invoiceNumber', condition: 'equalTo', isNumber: true },
    //   {
    //     key: 'createdOrBackdatedDatetime',
    //     condition: 'between',
    //   },
    //   {
    //     key: 'status',
    //     condition: 'equalTo',
    //   },
    // ],
  });
  const listParams = {
    sortBy,
    first,
    offset,
    filterBy,
  };
  const navigate = useNavigate();
  // const modalController = useToggle();
  const {
    query: { data, isError, isLoading },
  } = usePurchaseOrderList(listParams);
  const pagination = { page, first, offset };

  const columns = useColumns<PurchaseOrderRowFragment>(
    [
      GenericColumnKey.Selection,
      {
        key: 'supplier',
        label: 'label.supplier',
        // format: ColumnFormat.Date,
        accessor: ({ rowData }) => rowData.supplier?.name,
        sortable: true,
      },
      [
        'invoiceNumber',
        {
          label: 'label.number',
          // description: 'description.invoice-number',
          maxWidth: 110,
          accessor: ({ rowData }) => rowData.number,
        },
      ],
      {
        key: 'createdDatetime',
        label: 'label.created',
        format: ColumnFormat.Date,
        accessor: ({ rowData }) => rowData.createdDatetime,
        sortable: true,
      },
      {
        key: 'confirmedDatetime',
        label: 'label.confirmed',
        format: ColumnFormat.Date,
        accessor: ({ rowData }) => rowData.confirmedDatetime,
        sortable: true,
      },
      [
        'status',
        {
          formatter: status =>
            getStatusTranslator(t)(status as PurchaseOrderNodeStatus),
        },
      ],
      {
        key: 'targetMonths',
        label: 'label.target-months',
        // format: ColumnFormat.Date,
        accessor: ({ rowData }) => rowData.targetMonths,
        sortable: true,
      },
      {
        key: 'deliveryDatetime',
        label: 'label.delivered',
        format: ColumnFormat.Date,
        accessor: ({ rowData }) => rowData.deliveredDatetime,
        sortable: true,
      },
      ['comment'],
    ],
    { onChangeSortBy: updateSortQuery, sortBy },
    [sortBy]
  );

  return (
    <>
      <Toolbar filter={filter} />
      <AppBarButtons
        // modalController={modalController}
        listParams={listParams}
      />
      <DataTable
        id="prescription-list"
        enableColumnSelection
        pagination={{ ...pagination, total: data?.totalCount ?? 0 }}
        onChangePage={updatePaginationQuery}
        columns={columns}
        data={data?.nodes ?? []}
        isError={isError}
        isLoading={isLoading}
        noDataElement={
          <NothingHere
            body={t('error.no-prescriptions')}
            // onCreate={modalController.toggleOn}
          />
        }
        onRowClick={row => {
          navigate(row.id);
        }}
      />
      <Footer listParams={listParams} />
    </>
  );
};

export const PurchaseOrderListView: FC = () => (
  <TableProvider createStore={createTableStore}>
    <ListView />
  </TableProvider>
);
