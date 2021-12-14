import React, { FC } from 'react';
import {
  useNavigate,
  DataTable,
  useColumns,
  useListData,
  TableProvider,
  createTableStore,
  useOmSupplyApi,
  getNameAndColorColumn,
  Color,
  useFormatDate,
} from '@openmsupply-client/common';
import { Toolbar } from './Toolbar';
import { AppBarButtons } from './AppBarButtons';
import { getSupplierRequisitionListViewApi } from './api';
import { RequisitionRow } from '../../types';

export const SupplierRequisitionListView: FC = () => {
  const navigate = useNavigate();
  const { api } = useOmSupplyApi();
  const d = useFormatDate();

  const {
    totalCount,
    data,
    onDelete,
    onUpdate,
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
    [
      getNameAndColorColumn((row: RequisitionRow, color: Color) => {
        onUpdate({ ...row, color: color.hex });
      }),
      {
        key: 'requisitionNumber',
        label: 'label.number',
      },
      'status',
      {
        key: 'orderDate',
        label: 'label.requisition-date',
        width: 100,
        accessor: rowData => (rowData.orderDate ? d(rowData.orderDate) : ''),
      },
      'comment',
      'selection',
    ],
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
