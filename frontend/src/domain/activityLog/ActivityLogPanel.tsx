import { createResource, Suspense, type Component, type JSX } from 'solid-js';
import { graphqlFetch } from '../../api/graphql';
import { createTableConfig } from '../../api/createTableConfig';
import { t } from '../../intl';
import type { LocaleKey } from '../../intl/locales';
import { dictionaries, locale } from '../../intl/intl';
import { localisedTime } from '../../intl/formatDateTime';
import { Spinner } from '../../ui/elements/feedback/Spinner';
import { DataTable, type Column } from '../../ui/elements/table/DataTable';
import { getDateCell } from '../../ui/elements/table/tableHelpers';
import {
  ActivityLog as ActivityLogDoc,
  type ActivityLogFragment,
  type ActivityLogVariables,
} from './activityLog.generated';

// The shared "Log" tab surface: the activity-log entries recorded against ONE
// record, scoped by recordId. A read-only, non-paginated table — Date · Time ·
// User · Event · Details — mirroring the real OMS ActivityLogList. Its own
// query (kdd/state-management), independent of the record's other resources, so
// switching to the tab fetches it once. The log is append-only and short per
// record, so — like OMS — we pull a generous single page and don't paginate.
//
// Consumed by any record's detail (spec/stock S2 › Log tab names it a "shared
// activity-log surface"; the stocktakes vertical has its own equivalent).

type Log = ActivityLogFragment;

const LOG_PAGE_SIZE = 1000;

// The event name: the enum maps to a `log.<kebab>` translation key (OMS
// Formatter.logTypeTranslation parity — TYPE → `log.<lower, _→->`). t() has no
// react-i18next `defaultValue`, so look the key up in the active dictionary
// first and fall back to the raw enum value when unmapped.
const eventLabel = (type: Log['type']): string => {
  const key = `log.${type.toLowerCase().replace(/_/g, '-')}` as LocaleKey;
  const dict = dictionaries()[locale()];
  return dict?.[key] !== undefined ? t(key) : type;
};

const tryParseObject = (
  value: string | null
): Record<string, unknown> | null => {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    return typeof parsed === 'object' && parsed !== null
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
};

const fieldLabel = (key: string): string => {
  const localeKey = `label.${key}` as LocaleKey;
  const dict = dictionaries()[locale()];
  return dict?.[localeKey] !== undefined ? t(localeKey) : key;
};

// A change's before/after detail (`from`/`to`). When `to` parses to a JSON
// object we diff its keys against `from` and render one line per changed field;
// otherwise fall back to the scalar "[from] to [to]" form. (Ported from OMS's
// formatChangeDetails — the same rendering the stocktakes Log tab uses.)
const changeDetails = (from: string | null, to: string | null): JSX.Element => {
  const fromObj = tryParseObject(from);
  const toObj = tryParseObject(to);

  if (toObj) {
    const keys = new Set([
      ...Object.keys(fromObj ?? {}),
      ...Object.keys(toObj),
    ]);
    const changes: JSX.Element[] = [];
    for (const key of keys) {
      const before = fromObj?.[key];
      const after = toObj[key];
      if (JSON.stringify(before) === JSON.stringify(after)) continue;
      const label = <strong>{fieldLabel(key)}:</strong>;
      if (before != null && after != null) {
        changes.push(
          <div>
            {label} {JSON.stringify(before)}{' '}
            <strong>{t('log.changed-to')}</strong> {JSON.stringify(after)}
          </div>
        );
      } else if (before != null) {
        changes.push(
          <div>
            {label} {t('log.removed')} {JSON.stringify(before)}
          </div>
        );
      } else {
        changes.push(
          <div>
            {label} {JSON.stringify(after)}
          </div>
        );
      }
    }
    return (
      <span
        style={{
          display: 'inline-flex',
          'flex-direction': 'column',
          gap: '0.25rem',
        }}
      >
        {changes}
      </span>
    );
  }

  if (from && to)
    return <span>{`[${from}] ${t('log.changed-to')} [${to}]`}</span>;
  if (from) return <span>{`${t('log.changed-from')} [${from}]`}</span>;
  return <span />;
};

export const ActivityLogPanel: Component<{
  storeId: string;
  recordId: string;
}> = props => {
  // Column config (order/sizing/pinning/visibility/density), resolved default →
  // global → user (kdd/table-state). It is also what puts the Columns and
  // Settings controls in the table's toolbar at all — DataTable renders both
  // only when `setConfig` is wired — so a panel without it silently loses them
  // on every vertical's Log tab.
  //
  // ONE id shared by every consumer, not a `tableId` prop per vertical: the log
  // columns are identical everywhere, and OMS keys this same table on one id
  // ('activity-log-list'). So a reader who hides Details hides it on every Log
  // tab — one layout to configure rather than four that drift.
  const tableConfig = createTableConfig({ tableId: 'activity-log' });

  // Keyed on serialised variables (stable string) so identical content doesn't
  // refetch (kdd/solid-reactivity-pitfalls). Sorted by id descending = most
  // recent first (activity-log ids are monotonic; OMS orders the same way).
  const variables = (): ActivityLogVariables => ({
    storeId: props.storeId,
    recordId: props.recordId,
    page: { first: LOG_PAGE_SIZE, offset: 0 },
    sort: [{ key: 'id', desc: true }],
  });
  const [logData] = createResource(
    () => JSON.stringify(variables()),
    async serialised => {
      const result = await graphqlFetch(
        ActivityLogDoc,
        JSON.parse(serialised) as ActivityLogVariables
      );
      if (result.kind !== 'success') return undefined;
      return result.data.activityLogs;
    }
  );

  const rows = (): Log[] => logData.latest?.nodes ?? [];

  const columns = (): Column<Log, never>[] => [
    { c: { key: 'datetime' }, header: () => t('label.date'), ...getDateCell() },
    {
      c: { accessor: log => localisedTime(log.datetime), id: 'time' },
      header: () => t('label.time'),
      meta: { align: 'right' },
    },
    {
      c: { accessor: log => log.user?.username ?? '', id: 'user' },
      header: () => t('label.user'),
    },
    {
      c: { accessor: log => eventLabel(log.type), id: 'event' },
      header: () => t('label.event'),
    },
    {
      c: { id: 'details' },
      header: () => t('label.details'),
      cell: info => changeDetails(info.row.original.from, info.row.original.to),
    },
  ];

  return (
    <Suspense fallback={<Spinner center />}>
      <DataTable
        columns={columns()}
        rows={rows()}
        rowKey={log => log.id}
        emptyMessage={t('messages.no-log-entries')}
        config={tableConfig.config()}
        setConfig={tableConfig.setConfig}
        configIsDefault={tableConfig.isConfigDefault()}
        // Central-server admins (EDIT_CENTRAL_DATA) can promote their layout
        // to the install-wide default; everyone else gets no action.
        onSaveGlobalDefault={
          tableConfig.canSaveGlobalDefault()
            ? tableConfig.saveGlobalTableConfig
            : undefined
        }
      />
    </Suspense>
  );
};
