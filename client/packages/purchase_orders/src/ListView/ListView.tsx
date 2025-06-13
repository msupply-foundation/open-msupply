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
} from '@openmsupply-client/common';
import { usePurchaseOrderList } from '../api';
import { PurchaseOrderFragment } from '../api/operations.generated';
import { Toolbar } from './Toolbar';
import { AppBarButtons } from './AppBarButtons';
import { Footer } from './Footer';

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
  const modalController = useToggle();
  const {
    query: { data, isError, isLoading },
  } = usePurchaseOrderList(listParams);
  const pagination = { page, first, offset };

  const columns = useColumns<PurchaseOrderFragment>(
    [
      GenericColumnKey.Selection,
      // [getNameAndColorColumn(), { setter: update }],
      [
        'status',
        // {
        //   formatter: status =>
        //     getStatusTranslator(t)(status as InvoiceNodeStatus),
        // },
      ],
      [
        'invoiceNumber',
        { description: 'description.invoice-number', maxWidth: 110 },
      ],
      {
        key: 'prescriptionDatetime',
        label: 'label.prescription-date',
        format: ColumnFormat.Date,
        accessor: ({ rowData }) => rowData.createdDatetime,
        sortable: true,
      },
      ['theirReference', { description: '', maxWidth: 110 }],
      getCommentPopoverColumn(),
    ],
    { onChangeSortBy: updateSortQuery, sortBy },
    [sortBy]
  );

  return (
    <>
      <Toolbar filter={filter} />
      <AppBarButtons
        modalController={modalController}
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
