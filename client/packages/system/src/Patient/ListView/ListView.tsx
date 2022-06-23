import React, { FC, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  useFormatDateTime,
  ColumnAlign,
  useAlertModal,
  useTranslation,
} from '@openmsupply-client/common';
import { TransitionProps } from '@mui/material/transitions';
import { DetailModal } from '../DetailModal';
import { usePatient, PatientRowFragment } from '../api';
import { AppBarButtons } from './AppBarButtons';

const PatientListComponent: FC = () => {
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const { data, isError, isLoading, pagination, sort } =
    usePatient.document.list();
  const t = useTranslation('common');
  const { sortBy, onChangeSortBy } = sort;
  const { Modal, showDialog, hideDialog } = useDialog();
  const { localisedDate } = useFormatDateTime();
  const navigate = useNavigate();
  const alert = useAlertModal({
    title: t('heading.no-patient-record'),
    message: t('messages.no-patient-record'),
  });

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
        align: ColumnAlign.Right,
        width: 160,
        formatter: dateString =>
          dateString ? localisedDate((dateString as string) || '') : '',
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
          console.log('Row', row);
          // setSelectedId(row.document?.name);
          if (!row.id || !row.document?.name || !row.document?.type) alert();
          else navigate(`/patients/${row.id}/${row.document.type}`);
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
        <DetailModal docId={selectedId} />
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
