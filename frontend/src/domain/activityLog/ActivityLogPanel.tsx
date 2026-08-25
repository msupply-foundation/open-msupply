import { createResource, type Component, type JSX } from 'solid-js';
import { graphqlFetch } from '../../api/graphql';
import { gated } from '../../api/gated';
import { createTableConfig } from '../../api/createTableConfig';
import { t } from '../../intl';
import type { LocaleKey } from '../../intl/locales';
import { dictionaries, locale } from '../../intl/intl';
import { DataTable, type Column } from '../../ui/elements/table/DataTable';
import {
  getCellDefinition,
  getTextCell,
} from '../../ui/elements/table/tableHelpers';
import { remToPx } from '../../ui/utils/rem';
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
// THE Log tab for every vertical (kdd/domain-modules): stocktakes, inbound
// shipments and both returns each grew their own copy while their verticals
// were built separately, and the copies drifted — two lost the Columns/Settings
// toolbar, two rendered no Details column, two labelled events from a
// hand-written switch instead of the `log.*` catalogue, and one wire bug had to
// be fixed in three places. A vertical that needs a different row ORDER passes
// `order`; anything else it needs belongs here, not in a fifth copy.

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
  /**
   * Row order, by datetime. The consuming vertical's spec decides:
   * items/patients mandate most-recent-first (the default),
   * requisitions/internal-orders mandate oldest-first (AC-LG1 / AC-AL1 —
   * matching the real OMS ActivityLogList, which sends no sort and gets the
   * server's datetime-ascending default).
   */
  order?: 'newest-first' | 'oldest-first';
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
  // refetch (kdd/solid-reactivity-pitfalls). No sort — the row order is a
  // client-side concern (see `rows`).
  const variables = (): ActivityLogVariables => ({
    storeId: props.storeId,
    recordId: props.recordId,
    page: { first: LOG_PAGE_SIZE, offset: 0 },
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

  // Ordered by datetime client-side: the wire has no datetime sort key, and an
  // id sort scrambles the chronology (ids are UUIDs). The server hands us the
  // whole log datetime-ascending, so this is a reorder of a complete set, not a
  // re-sort of one page.
  //
  // The Log tab mounts fresh when selected (inactive TabPanels unmount), so
  // this resource FIRST fetches on an interaction — it MUST be read
  // non-suspending, or it suspends the already-open detail screen's boundary
  // and remounts it (kdd/solid-reactivity-pitfalls › No remounts on
  // interaction). The table's own `loading` covers the wait.
  const rows = (): Log[] => {
    const nodes = gated(logData)?.nodes ?? [];
    const direction = props.order === 'oldest-first' ? 1 : -1;
    return [...nodes].sort((a, b) =>
      a.datetime === b.datetime
        ? 0
        : direction * (a.datetime < b.datetime ? -1 : 1)
    );
  };

  // Date / time / user take their cell-type presets (rendering AND width —
  // ui/docs/CELL_TYPES.md); the accessors hand over the RAW instant and the
  // presets localise it. Pre-formatting the time here would hand the `time`
  // preset a clock string and throw "Invalid time value".
  const columns = (): Column<Log, never>[] => [
    {
      c: { key: 'datetime' },
      header: () => t('label.date'),
      ...getCellDefinition('date'),
    },
    {
      c: { accessor: log => log.datetime, id: 'time' },
      header: () => t('label.time'),
      ...getCellDefinition('time'),
    },
    {
      c: { accessor: log => log.user?.username ?? '', id: 'user' },
      header: () => t('label.user'),
      ...getCellDefinition('user'),
    },
    // Event / details have no CELL_DEF key: the event name is a sentence-ish
    // label and details is the run of changed fields, so both size here — with
    // details the widest, as the table's sink column.
    {
      c: { accessor: log => eventLabel(log.type), id: 'event' },
      header: () => t('label.event'),
      ...getTextCell(),
      size: remToPx(12),
    },
    {
      c: { id: 'details' },
      header: () => t('label.details'),
      ...getTextCell({ wrapLines: 3 }),
      size: remToPx(20),
      cell: info => changeDetails(info.row.original.from, info.row.original.to),
    },
  ];

  return (
    <DataTable
      columns={columns()}
      rows={rows()}
      rowKey={log => log.id}
      loading={logData.loading}
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
  );
};
