import React, { FC, useState } from 'react';
import {
  TableProvider,
  DataTable,
  useColumns,
  createTableStore,
  useDialog,
  DialogButton,
  Fade,
  NothingHere,
  createQueryParamsStore,
} from '@openmsupply-client/common';
import { TransitionProps } from '@mui/material/transitions';
import { DetailModal } from '../DetailModal';
import { useNames, NameRowFragment } from '../api';

const NameListComponent: FC<{ type: 'customer' | 'supplier' }> = ({ type }) => {
  const [selectedId, setSelectedId] = useState<string>('');
  const { data, isError, isLoading, pagination, sort } = useNames(type);
  const { sortBy, onChangeSortBy } = sort;
  const { Modal, showDialog, hideDialog } = useDialog();

  const columns = useColumns<NameRowFragment>(
    ['name', 'code'],
    {
      sortBy,
      onChangeSortBy,
    },
    [sortBy]
  );

  const Transition = React.forwardRef(
    (
      props: TransitionProps & {
        children: React.ReactElement;
      },
      ref: React.Ref<unknown>
    ) => <Fade ref={ref} {...props} timeout={800}></Fade>
  );

  return (
    <>
      <DataTable
        pagination={{ ...pagination, total: data?.totalCount }}
        onChangePage={pagination.onChangePage}
        columns={columns}
        data={data?.nodes}
        isLoading={isLoading}
        isError={isError}
        onRowClick={row => {
          setSelectedId(row.id);
          showDialog();
        }}
        noDataElement={<NothingHere />}
      />
      <Modal
        title=""
        sx={{ maxWidth: '90%' }}
        okButton={<DialogButton variant="ok" onClick={hideDialog} />}
        slideAnimation={false}
        Transition={Transition}
      >
        <DetailModal nameId={selectedId} />
      </Modal>
    </>
  );
};

export const NameListView: FC<{ type: 'customer' | 'supplier' }> = ({
  type,
}) => (
  <TableProvider
    createStore={createTableStore}
    queryParamsStore={createQueryParamsStore<NameRowFragment>({
      initialSortBy: { key: 'name' },
    })}
  >
    <NameListComponent type={type} />
  </TableProvider>
);
