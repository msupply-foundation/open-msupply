import React, { FC } from 'react';
import {
  TableProvider,
  DataTable,
  useColumns,
  createTableStore,
  NothingHere,
  useFormatDateTime,
  ColumnAlign,
  useTranslation,
  ProgramEnrolmentSortFieldInput,
  useUrlQueryParams,
  ColumnDataAccessor,
} from '@openmsupply-client/common';
import {
  PatientModal,
  ProgramEnrolmentRowFragmentWithId,
  usePatientModalStore,
  useProgramEnrolments,
} from '@openmsupply-client/programs';
import { usePatient } from '../../api';
import { getStatusTranslation } from '../utils';
import { createQueryParamsStore, useQueryParamsStore } from '@common/hooks';
import { ChipTableCell } from '@openmsupply-client/system';

const programAdditionalInfoAccessor: ColumnDataAccessor<
  ProgramEnrolmentRowFragmentWithId,
  string[]
> = ({ rowData }): string[] => {
  const additionalInfo = [];

  if (rowData?.activeProgramEvents[0]?.data) {
    additionalInfo.push(rowData.activeProgramEvents[0].data);
  }

  return additionalInfo;
};

const ProgramListComponent: FC = () => {
  const {
    pagination: { page, first, offset, onChangePage },
  } = useQueryParamsStore();

  const { queryParams, updateSortQuery } = useUrlQueryParams();

  const patientId = usePatient.utils.id();

  const { data, isError, isLoading } = useProgramEnrolments.document.list({
    sortBy: {
      key: queryParams.sortBy.key as ProgramEnrolmentSortFieldInput,
      isDesc: queryParams.sortBy.isDesc,
    },
    filterBy: { patientId: { equalTo: patientId } },
  });
  const pagination = { page, first, offset };
  const { localisedDate } = useFormatDateTime();
  const t = useTranslation('dispensary');
  const { setEditModal: setEditingModal, setModal: selectModal } =
    usePatientModalStore();

  const columns = useColumns<ProgramEnrolmentRowFragmentWithId>(
    [
      {
        key: 'type',
        label: 'label.enrolment-program',
        accessor: row => row.rowData?.document?.documentRegistry?.name,
      },
      {
        key: 'programEnrolmentId',
        label: 'label.enrolment-patient-id',
      },
      {
        label: 'label.additional-info',
        key: 'events',
        sortable: false,
        accessor: programAdditionalInfoAccessor,
        Cell: ChipTableCell,
        minWidth: 400,
      },
      {
        key: 'status',
        label: 'label.program-status',
        accessor: row => t(getStatusTranslation(row.rowData?.status)),
      },
      {
        key: 'enrolmentDatetime',
        label: 'label.enrolment-datetime',
        align: ColumnAlign.Right,
        width: 175,
        formatter: dateString =>
          dateString ? localisedDate((dateString as string) || '') : '',
      },
    ],
    {
      sortBy: queryParams.sortBy,
      onChangeSortBy: updateSortQuery,
    },
    [queryParams.sortBy, updateSortQuery]
  );

  return (
    <DataTable
      id="program-enrolment-list"
      pagination={{ ...pagination, total: data?.totalCount }}
      onChangePage={onChangePage}
      columns={columns}
      data={data?.nodes}
      isLoading={isLoading}
      isError={isError}
      onRowClick={row => {
        setEditingModal(PatientModal.Program, row.type, row.name, row.type);
      }}
      noDataElement={
        <NothingHere
          onCreate={() => selectModal(PatientModal.ProgramSearch)}
          body={t('messages.no-programs')}
          buttonText={t('button.add-program')}
        />
      }
    />
  );
};

export const ProgramListView: FC = () => (
  <TableProvider
    createStore={createTableStore}
    queryParamsStore={createQueryParamsStore<ProgramEnrolmentRowFragmentWithId>(
      {
        initialSortBy: {
          key: ProgramEnrolmentSortFieldInput.EnrolmentDatetime,
          isDesc: false,
        },
      }
    )}
  >
    <ProgramListComponent />
  </TableProvider>
);
