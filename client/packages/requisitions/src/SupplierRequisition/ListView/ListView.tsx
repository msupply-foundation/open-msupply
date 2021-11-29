import React, { FC } from 'react';
import { useNavigate } from 'react-router';
import {
  DataTable,
  useColumns,
  useListData,
  TableProvider,
  createTableStore,
  useOmSupplyApi,
} from '@openmsupply-client/common';
import { Toolbar } from './Toolbar';
import { AppBarButtons } from './AppBarButtons';
import { getSupplierRequisitionListViewApi } from './api';
import { RequisitionRow } from '../../types';

export const SupplierRequisitionListView: FC = () => {
  const navigate = useNavigate();
  const { api } = useOmSupplyApi();

  const {
    totalCount,
    data,
    isLoading,
    onDelete,
    // onUpdate,
    sortBy,
    onChangeSortBy,
    onChangePage,
    pagination,
    filter,
  } = useListData(
    {
      initialSortBy: { key: 'otherPartyName' },
      initialFilterBy: { type: { equalTo: 'SUPPLIER_REQUISITION' } },
    },
    'invoice',
    getSupplierRequisitionListViewApi(api)
  );

  const columns = useColumns<RequisitionRow>(
    ['otherPartyName', 'requisitionNumber', 'status', 'comment', 'selection'],
    { onChangeSortBy, sortBy },
    [sortBy]
  );

  return (
    <>
      <Toolbar onDelete={onDelete} data={data} filter={filter} />
      <AppBarButtons onCreate={() => {}} />

      <DataTable
        pagination={{ ...pagination, total: totalCount }}
        onChangePage={onChangePage}
        columns={columns}
        data={data ?? []}
        isLoading={isLoading}
        onRowClick={row => {
          navigate(row.id);
        }}
      />
    </>
  );
};

export const ListView: FC = () => {
  return (
    <TableProvider createStore={createTableStore}>
      <SupplierRequisitionListView />
    </TableProvider>
  );
};
