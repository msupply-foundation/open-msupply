import React, { FC, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  DataTable,
  useColumns,
  useListData,
  TableProvider,
  createTableStore,
  useNotification,
  generateUUID,
  useOmSupplyApi,
  getNameAndColorColumn,
  Color,
  useFormatDate,
} from '@openmsupply-client/common';
import { NameSearchModal } from '@openmsupply-client/system/src/Name';
import { Toolbar } from './Toolbar';
import { AppBarButtons } from './AppBarButtons';
import { getCustomerRequisitionListViewApi } from './api';
import { RequisitionRow } from '../../types';

export const CustomerRequisitionListView: FC = () => {
  const navigate = useNavigate();
  const { error } = useNotification();
  const { api } = useOmSupplyApi();
  const d = useFormatDate();

  const {
    totalCount,
    data,
    onDelete,
    onUpdate,
    sortBy,
    onChangeSortBy,
    onCreate,
    onChangePage,
    pagination,
    filter,
    invalidate,
  } = useListData(
    {
      initialSortBy: { key: 'otherPartyName' },
      initialFilterBy: { type: { equalTo: 'CUSTOMER_REQUISITION' } },
    },
    'requisition',
    getCustomerRequisitionListViewApi(api)
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

  const [open, setOpen] = useState(false);

  return (
    <>
      <NameSearchModal
        type="customer"
        open={open}
        onClose={() => setOpen(false)}
        onChange={async name => {
          setOpen(false);

          const createRequisition = async () => {
            const requisition = {
              id: generateUUID(),
              otherPartyId: name?.id,
            };

            try {
              const result = await onCreate(requisition);
              invalidate();
              navigate(result);
            } catch (e) {
              const errorSnack = error(
                'Failed to create requisition! ' + (e as Error).message
              );
              errorSnack();
            }
          };

          createRequisition();
        }}
      />

      <Toolbar onDelete={onDelete} data={data} filter={filter} />
      <AppBarButtons onCreate={setOpen} />

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
      <CustomerRequisitionListView />
    </TableProvider>
  );
};
