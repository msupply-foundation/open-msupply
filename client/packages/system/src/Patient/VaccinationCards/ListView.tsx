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
  useNavigate,
  RouteBuilder,
} from '@openmsupply-client/common';
import {
  ProgramEnrolmentRowFragmentWithId,
  useProgramEnrolments,
} from '@openmsupply-client/programs';
import { usePatient } from '../api';
import { createQueryParamsStore, useQueryParamsStore } from '@common/hooks';
import { AppRoute } from '@openmsupply-client/config';

const VaccinationCardListComponent: FC = () => {
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
    filterBy: {
      patientId: { equalTo: patientId },
      isImmunisationProgram: true,
    },
  });
  const pagination = { page, first, offset };
  const { localisedDate } = useFormatDateTime();
  const t = useTranslation('dispensary');
  const navigate = useNavigate();

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
      // TODO - add column for next appointment
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
      id="vaccination-card-list"
      pagination={{ ...pagination, total: data?.totalCount ?? 0 }}
      onChangePage={updatePaginationQuery}
      columns={columns}
      data={data?.nodes}
      isLoading={isLoading}
      isError={isError}
      onRowClick={row => {
        navigate(
          RouteBuilder.create(AppRoute.Dispensary)
            .addPart(AppRoute.VaccineCard)
            .addPart(row.id)
            .build()
        );
      }}
      noDataElement={
        <NothingHere
          body={t('messages.no-programs')}
          buttonText={t('button.add-program')}
        />
      }
    />
  );
};

export const VaccinationCardsListView = () => (
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
    <VaccinationCardListComponent />
  </TableProvider>
);
