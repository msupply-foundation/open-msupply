import type { GraphqlResult } from '@/api/graphql';
import { formatNumber, t, type LocaleKey } from '@/intl';
import {
  tooLargeMessage,
  type FileLike,
  type FileRejection,
} from '@/ui/elements/inputs/uploadFiles';
import type {
  CentralDataErrorsFileResult,
  CentralDataExportResult,
  CentralDataExportVariables,
  CentralDataImportResultFragment,
} from './centralData.generated';

// The export's filters, choosing a file and reading the result of an import
// (spec/central-data rules.md § export, § limits, § preview and import). The
// upload itself is api/postFiles.ts's `uploadFile`.

type ExportTableInput = CentralDataExportVariables['tables'][number];

export type TableKey = ExportTableInput['table'];

/**
 * `sheet` is the workbook sheet the table reads, `searchKey` names what its
 * search matches, and `hasStatus` whether it has an active flag to filter on
 * (rules.md § tables).
 */
export const TABLES: {
  value: TableKey;
  labelKey: LocaleKey;
  sheet: string;
  searchKey: LocaleKey;
  hasStatus: boolean;
}[] = [
  {
    value: 'UNIT',
    labelKey: 'label.units',
    sheet: 'unit',
    searchKey: 'label.name-contains',
    hasStatus: true,
  },
  {
    value: 'LOCATION_TYPE',
    labelKey: 'label.location-types',
    sheet: 'location_type',
    searchKey: 'label.code-or-name-contains',
    hasStatus: false,
  },
  {
    value: 'CURRENCY',
    labelKey: 'label.currencies',
    sheet: 'currency',
    searchKey: 'label.code-contains',
    hasStatus: true,
  },
  {
    value: 'NAME',
    labelKey: 'label.names',
    sheet: 'name',
    searchKey: 'label.code-or-name-contains',
    hasStatus: false,
  },
  {
    value: 'STORE',
    labelKey: 'stores',
    sheet: 'store',
    searchKey: 'label.code-or-name-contains',
    hasStatus: true,
  },
  {
    value: 'USER',
    labelKey: 'label.users',
    sheet: 'user',
    searchKey: 'label.username-contains',
    hasStatus: true,
  },
  {
    value: 'ITEM',
    labelKey: 'items',
    sheet: 'item',
    searchKey: 'label.code-or-name-contains',
    hasStatus: true,
  },
  {
    value: 'MASTER_LIST',
    labelKey: 'label.master-lists',
    sheet: 'master_list',
    searchKey: 'label.code-or-name-contains',
    hasStatus: true,
  },
  {
    value: 'MASTER_LIST_LINE',
    labelKey: 'label.master-list-lines',
    sheet: 'master_list_line',
    searchKey: 'label.master-list-name-or-item-code-contains',
    hasStatus: false,
  },
  {
    value: 'MASTER_LIST_NAME_JOIN',
    labelKey: 'label.names-on-master-lists',
    sheet: 'master_list_name_join',
    searchKey: 'label.master-list-name-or-name-code-contains',
    hasStatus: false,
  },
  {
    value: 'NAME_STORE_JOIN',
    labelKey: 'label.names-in-stores',
    sheet: 'name_store_join',
    searchKey: 'label.code-contains',
    hasStatus: false,
  },
  {
    value: 'USER_STORE_JOIN',
    labelKey: 'label.users-in-stores',
    sheet: 'user_store_join',
    searchKey: 'label.username-or-store-code-contains',
    hasStatus: false,
  },
  {
    value: 'USER_PERMISSION',
    labelKey: 'label.user-permissions',
    sheet: 'user_permission',
    searchKey: 'label.username-or-store-code-contains',
    hasStatus: false,
  },
];

/** `undefined` for a table this screen doesn't know yet. */
export const tableEntry = (table: TableKey) =>
  TABLES.find(entry => entry.value === table);

export type Status = 'ALL' | 'ACTIVE' | 'INACTIVE';

/** One row of the export card, in TABLES order. */
export type TableFilter = {
  table: TableKey;
  ticked: boolean;
  contains: string;
  status: Status;
};

export const emptyFilters = (): TableFilter[] =>
  TABLES.map(({ value }) => ({
    table: value,
    ticked: false,
    contains: '',
    status: 'ALL',
  }));

/** The ticked tables, as the export and its counts take them. */
export const exportInputs = (filters: TableFilter[]): ExportTableInput[] =>
  filters
    .filter(filter => filter.ticked)
    .map(({ table, contains, status }) => ({
      table,
      contains: contains.trim() || null,
      isActive: status === 'ALL' ? null : status === 'ACTIVE',
    }));

export const hasFilters = (filters: TableFilter[]) =>
  filters.some(
    filter => filter.contains.trim() !== '' || filter.status !== 'ALL'
  );

type ExportResponse =
  CentralDataExportResult['centralServer']['centralData']['export'];

export type ExportOutcome =
  | { kind: 'file'; fileId: string }
  | { kind: 'tooManyRows'; rowCount: number; maxRows: number }
  | { kind: 'failed' };

export const exportOutcome = (
  result: GraphqlResult<ExportResponse>
): ExportOutcome => {
  if (result.kind !== 'success') return { kind: 'failed' };
  const response = result.data;
  if (response.__typename === 'CentralDataExportNode')
    return { kind: 'file', fileId: response.fileId };
  const { error } = response;
  return {
    kind: 'tooManyRows',
    rowCount: error.rowCount,
    maxRows: error.maxRows,
  };
};

/** The upload zone's accept list. */
export const IMPORT_ACCEPT = '.xlsx';

type Summary = Extract<
  CentralDataImportResultFragment,
  { __typename: 'CentralDataImportNode' }
>;

export type ImportOutcome =
  | { kind: 'summary'; summary: Summary }
  | { kind: 'tooManyRows'; rowCount: number; maxRows: number }
  | { kind: 'tooManyCells'; cellCount: number; maxCells: number }
  | { kind: 'unreadable'; reason: string }
  /** The upload is no longer on the server (rules.md § preview and import). */
  | { kind: 'expired' }
  /** Already reported by the global error modal. */
  | { kind: 'failed' };

/** The server's refusal of an upload, shown in the import card's banner. */
export type Refusal = Exclude<
  ImportOutcome,
  { kind: 'summary' } | { kind: 'failed' }
>;

/** The import card's banner for a refusal (ui-surface.md § import card). */
export const refusalMessage = (refusal: Refusal): string => {
  switch (refusal.kind) {
    case 'tooManyRows':
      return t('error.central-data-too-many-rows', {
        rowCount: formatNumber(refusal.rowCount),
        maxRows: formatNumber(refusal.maxRows),
      });
    case 'tooManyCells':
      return t('error.central-data-too-many-cells', {
        cellCount: formatNumber(refusal.cellCount),
        maxCells: formatNumber(refusal.maxCells),
      });
    case 'unreadable':
      return t('error.central-data-unreadable', { reason: refusal.reason });
    case 'expired':
      return t('error.central-data-upload-expired');
  }
};

/** The import card's banner for a file the zone refused, before any upload. */
export const pickRefusalMessage = (
  rejection: FileRejection<FileLike>,
  maxBytes: number
): string =>
  rejection.reason === 'size'
    ? tooLargeMessage(rejection.file.name, maxBytes)
    : t('error.central-data-xlsx-only');

type Problem = Extract<
  CentralDataImportResultFragment,
  { __typename: 'CentralDataImportError' }
>;

const refusal = ({ error }: Problem): Refusal => {
  if (error.__typename === 'CentralDataTooManyRows')
    return {
      kind: 'tooManyRows',
      rowCount: error.rowCount,
      maxRows: error.maxRows,
    };
  if (error.__typename === 'CentralDataTooManyCells')
    return {
      kind: 'tooManyCells',
      cellCount: error.cellCount,
      maxCells: error.maxCells,
    };
  if (error.__typename === 'CentralDataUploadExpired')
    return { kind: 'expired' };
  return { kind: 'unreadable', reason: error.description };
};

export const importOutcome = (
  result: GraphqlResult<CentralDataImportResultFragment>
): ImportOutcome => {
  if (result.kind !== 'success') return { kind: 'failed' };
  const response = result.data;
  return response.__typename === 'CentralDataImportNode'
    ? { kind: 'summary', summary: response }
    : refusal(response);
};

type ErrorsFileResponse =
  CentralDataErrorsFileResult['centralServer']['centralData']['errorsFile'];

export type ErrorsFileOutcome =
  { kind: 'file'; fileId: string } | Refusal | { kind: 'failed' };

export const errorsFileOutcome = (
  result: GraphqlResult<ErrorsFileResponse>
): ErrorsFileOutcome => {
  if (result.kind !== 'success') return { kind: 'failed' };
  const response = result.data;
  return response.__typename === 'CentralDataExportNode'
    ? { kind: 'file', fileId: response.fileId }
    : refusal(response);
};

/** The errors file's name: the upload's, marked as holding its errors. */
export const errorsFileName = (fileName: string) =>
  `${fileName.replace(/\.xlsx$/i, '')} (errors).xlsx`;

/** Lift the import result out of the namespaced response. */
export const unwrap = <T, R>(
  result: GraphqlResult<T>,
  pick: (data: T) => R
): GraphqlResult<R> =>
  result.kind === 'success'
    ? { kind: 'success', data: pick(result.data) }
    : result;

export const totals = (summary: Summary) =>
  summary.tables.reduce(
    (sum, table) => ({
      inserted: sum.inserted + table.inserted,
      updated: sum.updated + table.updated,
      deleted: sum.deleted + table.deleted,
    }),
    { inserted: 0, updated: 0, deleted: 0 }
  );

/** What Import would write: everything but unchanged rows. */
export const changeCount = (summary: Summary) => {
  const { inserted, updated, deleted } = totals(summary);
  return inserted + updated + deleted;
};

/** The changed-row badge; unchanged rows are never listed. A restore counts
 *  as updated, but has its own badge, as it brings back a deleted record. */
const CHANGE_BADGE: Record<
  Exclude<Summary['changes'][number]['change'], 'UNCHANGED'>,
  { labelKey: LocaleKey; tone?: 'info' | 'warning' }
> = {
  INSERTED: { labelKey: 'label.change-new', tone: 'info' },
  UPDATED: { labelKey: 'label.change-updated' },
  RESTORED: { labelKey: 'label.change-restored', tone: 'warning' },
  DELETED: { labelKey: 'label.change-deleted', tone: 'warning' },
};

export const changeBadge = (change: Summary['changes'][number]['change']) =>
  change === 'UNCHANGED' ? undefined : CHANGE_BADGE[change];

/** Isolates a value's direction (FSI…PDI), so a Latin code in a
 *  right-to-left line keeps its place around the arrow. */
const isolate = (value: string) => `\u2068${value}\u2069`;

/** An update's changed columns as one line, the cells as the sheet shows
 *  them; a blank cell reads as a dash. The catalog sets the arrow and the
 *  separator, so a right-to-left language can turn them round. */
export const describeFields = (fields: Summary['changes'][number]['fields']) =>
  fields
    .map(({ column, from, to }) =>
      t('label.central-data-field-change', {
        column: isolate(column),
        from: isolate(from || '—'),
        to: isolate(to || '—'),
      })
    )
    .join(t('label.central-data-field-change-separator'));
