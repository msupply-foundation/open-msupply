import React, { FC, useMemo } from 'react';
import {
  TableProvider,
  DataTable,
  useColumns,
  createTableStore,
  NothingHere,
  createQueryParamsStore,
  useFormatDateTime,
  useUrlQueryParams,
  ColumnAlign,
  EncounterNodeStatus,
  useTranslation,
  LocaleKey,
  TypedTFunction,
} from '@openmsupply-client/common';
import { EncounterFragment, useEncounter } from './api';
import { usePatientModalStore } from '../hooks';
import { PatientModal } from '../PatientView';

const effectiveStatus = (
  encounter: EncounterFragment,
  t: TypedTFunction<LocaleKey>
) => {
  const status = encounter.status;
  if (!status) {
    return '';
  }
  switch (status) {
    case EncounterNodeStatus.Cancelled:
      return t('label.encounter-status-cancelled');
    case EncounterNodeStatus.Done:
      return t('label.encounter-status-done');
    case EncounterNodeStatus.Scheduled:
      if (new Date(encounter.startDatetime).getTime() < Date.now()) {
        return t('label.encounter-status-missed');
      }
      return t('label.encounter-status-scheduled');
    default:
      ((_: never) => {
        // exhaustive check
        _;
      })(status);
  }
  return '';
};

type EncounterFragmentExt = {
  id: string;
  effectiveStatus: string;
} & EncounterFragment;

const useExtendEncounterFragment = (
  nodes?: EncounterFragment[]
): EncounterFragmentExt[] | undefined => {
  const t = useTranslation('common');
  return useMemo(
    () =>
      nodes?.map(node => ({
        id: node.name,
        effectiveStatus: effectiveStatus(node, t),
        ...node,
      })),
    [nodes]
  );
};

const EncounterListComponent: FC = () => {
  const {
    updateSortQuery,
    updatePaginationQuery,
    queryParams: { sortBy, page, first, offset },
  } = useUrlQueryParams();
  const { data, isError, isLoading } = useEncounter.document.list();
  const dataWithId: EncounterFragmentExt[] | undefined =
    useExtendEncounterFragment(data?.nodes);
  const pagination = { page, first, offset };
  const { localisedDateTime } = useFormatDateTime();
  const { setCurrent, setDocument, setProgramType } = usePatientModalStore();

  const columns = useColumns<EncounterFragmentExt>(
    [
      {
        key: 'type',
        label: 'label.encounter-type',
      },
      {
        key: 'program',
        label: 'label.program',
      },
      {
        key: 'startDatetime',
        label: 'label.encounter-start',
        formatter: dateString =>
          dateString ? localisedDateTime((dateString as string) || '') : '',
      },
      {
        key: 'endDatetime',
        label: 'label.encounter-end',
        formatter: dateString =>
          dateString ? localisedDateTime((dateString as string) || '') : '',
      },
      {
        key: 'effectiveStatus',
        label: 'label.status',
        align: ColumnAlign.Right,
        width: 175,
      },
    ],
    { onChangeSortBy: updateSortQuery, sortBy },
    [sortBy]
  );

  return (
    <DataTable
      id="encounter-list"
      pagination={{ ...pagination, total: data?.totalCount }}
      onChangePage={updatePaginationQuery}
      columns={columns}
      data={dataWithId}
      isLoading={isLoading}
      isError={isError}
      onRowClick={row => {
        setDocument({ type: row.type, name: row.name });
        setProgramType(row.program);
        setCurrent(PatientModal.Encounter);
      }}
      noDataElement={<NothingHere />}
    />
  );
};

export const EncounterListView: FC = () => (
  <TableProvider
    createStore={createTableStore}
    queryParamsStore={createQueryParamsStore<EncounterFragmentExt>({
      initialSortBy: { key: 'type' },
    })}
  >
    <EncounterListComponent />
  </TableProvider>
);
