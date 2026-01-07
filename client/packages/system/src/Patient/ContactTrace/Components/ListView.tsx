import React, { FC, useMemo } from 'react';
import {
  NothingHere,
  useUrlQueryParams,
  ContactTraceSortFieldInput,
  useNavigate,
  RouteBuilder,
  useTranslation,
  MaterialTable,
  usePaginatedMaterialTable,
  ColumnDef,
  ColumnType,
} from '@openmsupply-client/common';
import {
  useContactTraces,
  usePatientModalStore,
  PatientModal,
} from '@openmsupply-client/programs';
import { usePatient } from '../../api';
import { useQueryParamsStore } from '@common/hooks';
import { ContactTraceRowFragment } from '@openmsupply-client/programs';
import { AppRoute } from '@openmsupply-client/config';

const useContactTraceListColumns = () => {
  const t = useTranslation();

  const columns = useMemo(
    (): ColumnDef<ContactTraceRowFragment>[] => [
      {
        accessorKey: 'program.name',
        header: t('label.program'),
      },
      {
        accessorKey: 'datetime',
        header: t('label.date-created'),
        columnType: ColumnType.Date,
        enableSorting: true,
      },
      {
        accessorKey: 'firstName',
        header: t('label.first-name'),
        enableSorting: true,
      },
      {
        accessorKey: 'lastName',
        header: t('label.last-name'),
        enableSorting: true,
      },
      {
        accessorKey: 'gender',
        header: t('label.gender'),
        enableSorting: true,
      },
      {
        accessorKey: 'relationship',
        header: t('label.relationship'),
      },
      {
        accessorKey: 'age',
        header: t('label.age'),
        columnType: ColumnType.Date,
        enableSorting: true,
      },
    ],
    []
  );

  return columns;
};

export const ContactTraceListView: FC = () => {
  const t = useTranslation();
  const {
    sort: { sortBy },
  } = useQueryParamsStore();

  const { queryParams } = useUrlQueryParams();

  const patientId = usePatient.utils.id();

  const { data, isError, isLoading } = useContactTraces.document.list({
    ...queryParams,
    sortBy: {
      key: sortBy.key as ContactTraceSortFieldInput,
      isDesc: sortBy.isDesc,
    },
    filterBy: { patientId: { equalTo: patientId } },
  });
  const navigate = useNavigate();
  const { setModal: selectModal } = usePatientModalStore();

  const columns = useContactTraceListColumns();

  // TODO: test this table works now its using MRT
  const { table } = usePaginatedMaterialTable<ContactTraceRowFragment>({
    tableId: 'contact-trace-list',
    columns,
    data: data?.nodes,
    totalCount: data?.totalCount ?? 0,
    isLoading,
    isError,
    onRowClick: row => {
      navigate(
        RouteBuilder.create(AppRoute.Dispensary)
          .addPart(AppRoute.ContactTrace)
          .addPart(row.id)
          .build()
      );
    },
    noDataElement: <NothingHere
      onCreate={() => selectModal(PatientModal.ContactTraceSearch)}
      body={t('messages.no-contact-traces')}
      buttonText={t('button.add-contact-trace')}
    />,
  });

  return <MaterialTable table={table} />;
};
