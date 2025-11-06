import React from 'react';
import {
  NothingHere,
  useUrlQueryParams,
  useNavigate,
  EncounterSortFieldInput,
  useTranslation,
  usePaginatedMaterialTable,
  RouteBuilder,
  MaterialTable,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { useEncounterListColumns } from './columns';
import {
  EncounterFragmentWithStatus,
  useEncounterFragmentWithStatus,
} from '../utils';
import { useEncounter } from '@openmsupply-client/programs';

export const EncounterListView = () => {
  const t = useTranslation();
  const {
    queryParams: { sortBy, first, offset, filterBy },
  } = useUrlQueryParams({
    initialSort: {
      key: EncounterSortFieldInput.StartDatetime,
      dir: 'desc',
    },
    filters: [
      {
        key: 'patient.lastName',
      },
      {
        key: 'programEnrolment.programName',
      },
      {
        key: 'startDatetime',
        condition: 'between',
      },
      {
        key: 'status',
        condition: 'equalTo',
      },
    ],
  });
  const { data, isError, isFetching } = useEncounter.document.list({
    pagination: { first, offset },
    sortBy,
    filterBy: filterBy ?? undefined,
  });
  const navigate = useNavigate();
  const columns = useEncounterListColumns({
    includePatient: true,
  });
  const dataWithStatus: EncounterFragmentWithStatus[] | undefined =
    useEncounterFragmentWithStatus(data?.nodes);

  const { table } = usePaginatedMaterialTable({
    tableId: 'encounter-list',
    columns,
    data: dataWithStatus,
    totalCount: data?.totalCount ?? 0,
    isLoading: isFetching,
    isError,
    enableRowSelection: false,
    onRowClick: row => {
      navigate(
        RouteBuilder.create(AppRoute.Dispensary)
          .addPart(AppRoute.Encounter)
          .addPart(row.id)
          .build()
      );
    },
    noDataElement: <NothingHere body={t('error.no-encounters')} />,
  });

  return <MaterialTable table={table} />;
};
