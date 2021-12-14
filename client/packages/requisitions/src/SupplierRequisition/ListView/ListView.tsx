import React, { FC } from 'react';
import {
  useNavigate,
  useNotification,
  DataTable,
  useColumns,
  useListData,
  TableProvider,
  createTableStore,
  useOmSupplyApi,
  getNameAndColorColumn,
  Color,
  useFormatDate,
  useToggle,
  generateUUID,
} from '@openmsupply-client/common';
import { NameSearchModal } from '@openmsupply-client/system';
import { Toolbar } from './Toolbar';
import { AppBarButtons } from './AppBarButtons';
import { getSupplierRequisitionListViewApi } from './api';
import { RequisitionRow } from '../../types';

export const SupplierRequisitionListView: FC = () => {
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
    onChangePage,
    pagination,
    filter,
    invalidate,
    onCreate,
  } = useListData(
    {
      initialSortBy: { key: 'otherPartyName' },
      initialFilterBy: { type: { equalTo: 'SUPPLIER_REQUISITION' } },
    },
    'requisition',
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

  const modalController = useToggle(false);

  return (
    <>
      <NameSearchModal
        type="supplier"
        open={modalController.isOn}
        onClose={modalController.toggleOff}
        onChange={async name => {
          modalController.toggleOff();

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
      <AppBarButtons onCreate={modalController.toggleOn} />

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
