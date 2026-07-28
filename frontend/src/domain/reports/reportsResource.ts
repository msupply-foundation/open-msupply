import { graphqlFetch } from '../../api/graphql';
import { locale } from '../../intl';
import { currentStoreId } from '../../store/storeContext';
import { Reports } from './reports.generated';
import type { ReportsResult, ReportsVariables } from './reports.generated';

// The report-selector list for one record context (spec/reports S4). Fetched
// on demand per context — NOT a store-scoped singleton like locations: the list
// is small, context-specific, and read once when a selector opens, so a plain
// never-throwing fetch in the graphqlFetch style (kdd/graphql-client) is the
// right shape rather than a cached resource.

// One listed report — exactly the node the operation selects, so it is
// structurally the ArgumentsModal's ArgumentSchemaSource with no remapping
// (kdd/type-safety).
export type Report = Extract<
  ReportsResult['reports'],
  { __typename: 'ReportConnector' }
>['nodes'][number];

// The generated filter shape, used verbatim (kdd/type-safety: no remapping).
type ReportsFilter = NonNullable<ReportsVariables['filter']>;

// The ReportContext literal a caller filters by — the generated variables' own
// union (e.g. 'STOCKTAKE'), so a caller can't name a context the server doesn't
// know (kdd/type-safety).
export type ReportContext = NonNullable<ReportsFilter['context']>['equalTo'];

// A host vertical's extra narrowing of its selector's list — e.g. internal
// orders excludes sub-contexted (program R&R) forms with
// `subContext: {equalAnyOrNull: []}` (spec/reports contract › contexts).
export type ReportsExtraFilter = Pick<ReportsFilter, 'subContext'>;

// List the active reports for a record context (e.g. 'STOCKTAKE'), sorted by
// name. Returns [] on any failure (the global error/permission modal has
// already surfaced it) so the selector shows its empty state rather than
// throwing — same never-throwing convention as the stocktakes wrappers.
export const listReportsByContext = async (
  context: ReportContext,
  extraFilter?: ReportsExtraFilter
): Promise<Report[]> => {
  const result = await graphqlFetch(Reports, {
    storeId: currentStoreId() ?? '',
    userLanguage: locale(),
    // Active versions only — the fallback-to-standard selection rides on the
    // isActive filter (spec/reports contract › which version a user sees).
    filter: { context: { equalTo: context }, isActive: true, ...extraFilter },
    sort: [{ key: 'name' }],
  });
  if (result.kind !== 'success') return [];
  const connector = result.data.reports;
  return connector.__typename === 'ReportConnector' ? connector.nodes : [];
};
