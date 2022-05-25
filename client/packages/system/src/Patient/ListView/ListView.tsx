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
  Formatter,
} from '@openmsupply-client/common';
import { TransitionProps } from '@mui/material/transitions';
import { DetailModal } from '../DetailModal';
import { usePatient, PatientRowFragment } from '../api';
import { AppBarButtons } from './AppBarButtons';

const PatientListComponent: FC = () => {
  const [selectedId, setSelectedId] = useState<string>('');
  const { data, isError, isLoading, pagination, sort } =
    usePatient.document.list();
  const { sortBy, onChangeSortBy } = sort;
  const { Modal, showDialog, hideDialog } = useDialog();

  const columns = useColumns<PatientRowFragment>(
    [
      'code',
      {
        key: 'firstName',
        label: 'label.first-name',
      },
      {
        key: 'lastName',
        label: 'label.last-name',
      },
      {
        key: 'dateOfBirth',
        label: 'label.date-of-birth',
        width: 120,
        formatter: dateString =>
          dateString
            ? Formatter.expiryDate(new Date(dateString as string)) || ''
            : '',
      },
    ],
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
      <AppBarButtons sortBy={sortBy} />
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

export const PatientListView: FC = () => (
  <TableProvider
    createStore={createTableStore}
    queryParamsStore={createQueryParamsStore<PatientRowFragment>({
      initialSortBy: { key: 'name' },
    })}
  >
    <PatientListComponent />
  </TableProvider>
);
