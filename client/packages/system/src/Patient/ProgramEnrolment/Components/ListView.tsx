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
  getStatusEventData,
  usePatientModalStore,
  useProgramEnrolments,
} from '@openmsupply-client/programs';
import { usePatient } from '../../api';
import { createQueryParamsStore, useQueryParamsStore } from '@common/hooks';
import { ChipTableCell } from '@openmsupply-client/system';

const programAdditionalInfoAccessor: ColumnDataAccessor<
  ProgramEnrolmentRowFragmentWithId,
  string[]
> = ({ rowData }): string[] => {
  const additionalInfo = getStatusEventData(rowData.activeProgramEvents.nodes);
  return additionalInfo;
};

const ProgramListComponent: FC = () => {
  const {
    sort: { sortBy, onChangeSortBy },
  } = useQueryParamsStore();

  const {
    queryParams: { page, first, offset },
    updatePaginationQuery,
  } = useUrlQueryParams();

  const patientId = usePatient.utils.id();

  const { data, isError, isLoading } = useProgramEnrolments.document.list({
    sortBy: {
      key: sortBy.key as ProgramEnrolmentSortFieldInput,
      isDesc: sortBy.isDesc,
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
      sortBy,
      onChangeSortBy,
    },
    [sortBy, onChangeSortBy]
  );

  return (
    <DataTable
      id="program-enrolment-list"
      pagination={{ ...pagination, total: data?.totalCount ?? 0 }}
      onChangePage={updatePaginationQuery}
      columns={columns}
      data={data?.nodes}
      isLoading={isLoading}
      isError={isError}
      onRowClick={row => {
        setEditingModal(PatientModal.Program, row.type, row.name);
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
