import React, { FC } from 'react';
import {
  useNavigate,
  DataTable,
  useColumns,
  TableProvider,
  createTableStore,
  getNameAndColorColumn,
  useToggle,
  generateUUID,
} from '@openmsupply-client/common';
import { NameSearchModal } from '@openmsupply-client/system';
// import { Toolbar } from './Toolbar';
import { AppBarButtons } from './AppBarButtons';
import {
  RequestRequisitionRowFragment,
  useCreateRequestRequisition,
  useRequestRequisitions,
} from '../api';

export const SupplierRequisitionListView: FC = () => {
  const navigate = useNavigate();
  const { mutate } = useCreateRequestRequisition();
  const { data } = useRequestRequisitions();

  const columns = useColumns<RequestRequisitionRowFragment>(
    [
      [getNameAndColorColumn(), { setter: () => {} }],
      {
        key: 'requisitionNumber',
        label: 'label.number',
      },
      'status',
      'comment',
      'selection',
    ],
    {},
    []
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
          mutate({
            id: generateUUID(),
            otherPartyId: name?.id,
          });
        }}
      />
      {/* <Toolbar onDelete={onDelete} data={data} filter={filter} /> */}
      <AppBarButtons onCreate={modalController.toggleOn} />

      <DataTable
        columns={columns}
        data={data?.nodes ?? []}
        onRowClick={row => {
          navigate(String(row.requisitionNumber));
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
