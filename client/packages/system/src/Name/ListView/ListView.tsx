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
  useUrlQueryParams,
} from '@openmsupply-client/common';
import { TransitionProps } from '@mui/material/transitions';
import { DetailModal } from '../DetailModal';
import { useName, NameRowFragment } from '../api';
import { NameRenderer } from '../Components';

const NameListComponent: FC<{ type: 'customer' | 'supplier' }> = ({ type }) => {
  const [selectedId, setSelectedId] = useState<string>('');
  const {
    updateSortQuery,
    updatePaginationQuery,
    queryParams: { sortBy, page, first, offset },
  } = useUrlQueryParams();
  const { data, isError, isLoading } = useName.document.list(type);
  const pagination = { page, first, offset };

  const { Modal, showDialog, hideDialog } = useDialog();

  const columns = useColumns<NameRowFragment>(
    [
      {
        key: 'code',
        label: 'label.code',
        Cell: ({ rowData }) => (
          <NameRenderer label={rowData.code} isStore={!!rowData.store} />
        ),
        width: 100,
      },
      'name',
    ],
    {
      sortBy,
      onChangeSortBy: updateSortQuery,
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
        id="name-list"
        pagination={{ ...pagination, total: data?.totalCount ?? 0 }}
        onChangePage={updatePaginationQuery}
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
  <TableProvider createStore={createTableStore}>
    <NameListComponent type={type} />
  </TableProvider>
);
