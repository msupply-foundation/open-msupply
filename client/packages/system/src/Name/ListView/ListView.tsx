import React, { FC, useState } from 'react';
import {
  TableProvider,
  DataTable,
  useColumns,
  createTableStore,
  useDialog,
  DialogButton,
} from '@openmsupply-client/common';
import { DetailModal } from '../DetailModal';
import { useNames, NameRowFragment } from '../api';

export const NameListView: FC<{ type: 'customer' | 'supplier' }> = ({
  type,
}) => {
  const [selectedId, setSelectedId] = useState<string>('');
  const { data, isLoading, onChangePage, pagination, sortBy, onChangeSortBy } =
    useNames(type);
  const { Modal, showDialog, hideDialog } = useDialog();

  const columns = useColumns<NameRowFragment>(
    ['name', 'code'],
    {
      sortBy,
      onChangeSortBy,
    },
    [sortBy]
  );

  return (
    <TableProvider createStore={createTableStore}>
      <DataTable
        pagination={{ ...pagination, total: data?.totalCount }}
        onChangePage={onChangePage}
        columns={columns}
        data={data?.nodes}
        isLoading={isLoading}
        onRowClick={row => {
          setSelectedId(row.id);
          showDialog();
        }}
      />
      <Modal
        title=""
        sx={{ maxWidth: '90%' }}
        okButton={<DialogButton variant="ok" onClick={hideDialog} />}
      >
        <DetailModal nameId={selectedId} />
      </Modal>
    </TableProvider>
  );
};
