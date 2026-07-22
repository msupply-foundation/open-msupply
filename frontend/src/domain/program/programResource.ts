import { graphqlFetch } from '../../api/graphql';
import {
  Periods,
  ProgramRegistries,
  Programs,
  SchedulesWithPeriods,
  type PeriodsResult,
  type ProgramRegistriesResult,
  type ProgramsResult,
  type SchedulesWithPeriodsResult,
} from './program.generated';
import { createStoreScopedResource } from '../../api/storeScopedResource';
import { currentStoreId } from '../../store/storeContext';

// One program-enrolment registry node — a pickable program. The picker
// submits `contextId` (the program's context, what report data queries
// filter by), not the registry's own id (spec/reports contract "Arguments").
export type ProgramRegistry =
  ProgramRegistriesResult['documentRegistries']['nodes'][number];

// App-wide program-registries cache: fetched once per store, shared/deduped,
// refetched on store change (createStoreScopedResource). The server already
// restricts results to program contexts the user may see; an empty list is
// the common case on stores without the program module.
export const programRegistriesResource =
  createStoreScopedResource<ProgramRegistry>(currentStoreId, async storeId => {
    const result = await graphqlFetch(ProgramRegistries, { storeId });
    return result.kind === 'success'
      ? result.data.documentRegistries.nodes
      : undefined;
  });

// One pickable program for the report argument program picker (AC-R12) —
// exactly the node the Programs operation selects (kdd/type-safety).
export type ProgramListItem = Extract<
  ProgramsResult['programs'],
  { __typename: 'ProgramConnector' }
>['nodes'][number];

// The store's visible programs, name-sorted. A plain never-throwing fetch in
// the fetchLocations style: read once when an argument form opens — not a
// store-scoped singleton (reports are the only consumer today).
export const fetchPrograms = async (
  storeId: string
): Promise<ProgramListItem[]> => {
  const result = await graphqlFetch(Programs, { storeId });
  return result.kind === 'success' ? result.data.programs.nodes : [];
};

// One pickable period for the report argument period picker (AC-R16).
export type PeriodItem = Extract<
  PeriodsResult['periods'],
  { __typename: 'PeriodConnector' }
>['nodes'][number];

// `yyyy-mm-dd` of today in the viewer's local calendar — the periods query's
// "already begun" bound is the user's own today, not UTC's.
const localToday = (): string => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
};

// Periods that have already begun, optionally narrowed to a program — plain
// never-throwing fetch, read when an argument form opens (AC-R16).
export const fetchPeriods = async (
  storeId: string,
  programId?: string
): Promise<PeriodItem[]> => {
  const result = await graphqlFetch(Periods, {
    storeId,
    programId: programId ?? null,
    today: localToday(),
  });
  return result.kind === 'success' ? result.data.periods.nodes : [];
};

// One schedule (with its closed periods) for the report argument schedule
// cascade (AC-R17).
export type ScheduleWithPeriods = Extract<
  SchedulesWithPeriodsResult['schedulesWithPeriodsByProgram'],
  { __typename: 'PeriodSchedulesConnector' }
>['nodes'][number];

// A program's schedules with their closed periods — the schedule + period
// steps of the cascade; refetched when the chosen program changes.
export const fetchSchedulesWithPeriods = async (
  storeId: string,
  programId: string
): Promise<ScheduleWithPeriods[]> => {
  const result = await graphqlFetch(SchedulesWithPeriods, {
    storeId,
    programId,
  });
  return result.kind === 'success'
    ? result.data.schedulesWithPeriodsByProgram.nodes
    : [];
};
