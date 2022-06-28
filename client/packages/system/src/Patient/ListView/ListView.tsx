import React, { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TableProvider,
  DataTable,
  useColumns,
  createTableStore,
  NothingHere,
  createQueryParamsStore,
  useFormatDateTime,
  ColumnAlign,
  useAlertModal,
  useTranslation,
} from '@openmsupply-client/common';
import { usePatient, PatientRowFragment } from '../api';
import { AppBarButtons } from './AppBarButtons';

const PatientListComponent: FC = () => {
  const { data, isError, isLoading, pagination, sort } =
    usePatient.document.list();
  const t = useTranslation('common');
  const { sortBy, onChangeSortBy } = sort;
  const { localisedDate } = useFormatDateTime();
  const navigate = useNavigate();
  const alert = useAlertModal({
    title: t('error.something-wrong'),
    message: t('messages.no-patient-record'),
    onOk: () => {},
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
          if (!row.id || !row.document?.name || !row.document?.type) alert();
          else navigate(`/patients/${row.id}/${row.document.type}`);
        }}
        noDataElement={<NothingHere />}
      />
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
