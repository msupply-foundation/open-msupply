import React, { FC, useMemo } from 'react';
import {
  TableProvider,
  DataTable,
  useColumns,
  createTableStore,
  NothingHere,
  createQueryParamsStore,
  useFormatDateTime,
  ColumnAlign,
  useNavigate,
  RouteBuilder,
  EncounterNodeStatus,
  useTranslation,
  LocaleKey,
  TypedTFunction,
  DateUtils,
  useQueryParamsStore,
  EncounterSortFieldInput,
} from '@openmsupply-client/common';
import { usePatient } from '../api';
import { AppRoute } from 'packages/config/src';
import { EncounterRowFragment } from '../../Encounter';
import { ProgramEventFragment } from '../ProgramEnrolment/api';

const effectiveStatus = (
  encounter: EncounterRowFragment,
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
      if (DateUtils.isBefore(new Date(encounter.startDatetime), Date.now())) {
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
  effectiveStatus: string;
} & EncounterRowFragment;

const useExtendEncounterFragment = (
  nodes?: EncounterRowFragment[]
): EncounterFragmentExt[] | undefined => {
  const t = useTranslation('common');
  return useMemo(
    () =>
      nodes?.map(node => ({
        effectiveStatus: effectiveStatus(node, t),
        ...node,
      })),
    [nodes]
  );
};

const encounterEventCellValue = (events: ProgramEventFragment[]) => {
  // just take the name of the first event
  return events[0]?.name ?? '';
};

const EncounterListComponent: FC = () => {
  const {
    sort: { sortBy, onChangeSortBy },
    pagination: { page, first, offset, onChangePage },
  } = useQueryParamsStore();

  const { data, isError, isLoading } = usePatient.document.encounters({
    key: sortBy.key as EncounterSortFieldInput,
    isDesc: sortBy.isDesc,
  });
  const dataExt: EncounterFragmentExt[] | undefined =
    useExtendEncounterFragment(data?.nodes);
  const pagination = { page, first, offset };
  const { localisedDateTime } = useFormatDateTime();
  const navigate = useNavigate();

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
        key: 'events',
        label: 'label.label',
        formatter: events =>
          encounterEventCellValue((events as ProgramEventFragment[]) ?? []),
        sortable: false,
      },
      {
        key: 'effectiveStatus',
        label: 'label.status',
        align: ColumnAlign.Right,
        width: 175,
        sortable: false,
      },
    ],
    { onChangeSortBy, sortBy },
    [sortBy]
  );

  return (
    <DataTable
      id="encounter-list"
      pagination={{ ...pagination, total: data?.totalCount }}
      onChangePage={onChangePage}
      columns={columns}
      data={dataExt}
      isLoading={isLoading}
      isError={isError}
      onRowClick={row => {
        navigate(
          RouteBuilder.create(AppRoute.Dispensary)
            .addPart(AppRoute.Encounter)
            .addPart(row.id)
            .build()
        );
      }}
      noDataElement={<NothingHere />}
    />
  );
};

export const EncounterListView: FC = () => (
  <TableProvider
    createStore={createTableStore}
    queryParamsStore={createQueryParamsStore<EncounterFragmentExt>({
      initialSortBy: { key: 'startDatetime' },
    })}
  >
    <EncounterListComponent />
  </TableProvider>
);
