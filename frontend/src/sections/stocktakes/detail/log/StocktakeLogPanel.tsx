import { createResource, Suspense, type Component, type JSX } from 'solid-js';
import { graphqlFetch } from '../../../../api/graphql';
import { t } from '../../../../intl';
import type { LocaleKey } from '../../../../intl/locales';
import { dictionaries, locale } from '../../../../intl/intl';
import { localisedTime } from '../../../../intl/formatDateTime';
import { Spinner } from '../../../../ui/elements/feedback/Spinner';
import {
  DataTable,
  type Column,
} from '../../../../ui/elements/table/DataTable';
import { getDateCell } from '../../../../ui/elements/table/tableHelpers';
import {
  StocktakeLog,
  type StocktakeLogFragment,
  type StocktakeLogVariables,
} from './stocktakeLog.generated';

// The detail view's "Log" tab: the activity-log entries recorded against THIS
// stocktake (created / edited / finalised, plus the stock changes its lines
// produced). A read-only, non-paginated table — Date · Time · User · Event ·
// Details — mirroring the real OMS app's ActivityLogList. The log is its own
// query (kdd/state-management), independent of the header + line-table
// resources, so switching to this tab fetches it once and neither refetches the
// other.
//
// The activity log is append-only and short per record, so — like OMS — we pull
// a generous single page (first: 1000) and don't server-paginate it.

type Log = StocktakeLogFragment;

const LOG_PAGE_SIZE = 1000;

// The event name: the enum maps to a `log.<kebab>` translation key (OMS
// Formatter.logTypeTranslation parity — TYPE → `log.<lower, _→->`). Our t()
// has no react-i18next `defaultValue`, so we look the key up in the active
// dictionary first and fall back to the raw enum value when it isn't mapped
// (an unmapped type shows e.g. "STOCK_BATCH_CHANGE", not "log.stock-batch-...").
const eventLabel = (type: Log['type']): string => {
  const key = `log.${type.toLowerCase().replace(/_/g, '-')}` as LocaleKey;
  const dict = dictionaries()[locale()];
  return dict?.[key] !== undefined ? t(key) : type;
};

// A change's before/after detail (the `from`/`to` fields). Both may be a plain
// scalar string or a JSON blob. When `to` parses to a JSON object we diff its
// keys against `from` and render one line per changed field (field name via a
// `label.<key>` lookup, falling back to the raw key); otherwise we fall back to
// the scalar "[from] to [to]" form. Ported from OMS's formatChangeDetails.
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

  // Scalar fallback.
  if (from && to)
    return <span>{`[${from}] ${t('log.changed-to')} [${to}]`}</span>;
  if (from) return <span>{`${t('log.changed-from')} [${from}]`}</span>;
  return <span />;
};

export const StocktakeLogPanel: Component<{
  storeId: string;
  stocktakeId: string;
}> = props => {
  // The log entries for this record. Keyed on the serialised variables (a stable
  // string) so identical content doesn't refetch (kdd/solid-reactivity-pitfalls),
  // like the other stocktake resources. Sorted by id descending = most recent
  // first (activity-log ids are monotonic; OMS orders the same way).
  const variables = (): StocktakeLogVariables => ({
    storeId: props.storeId,
    recordId: props.stocktakeId,
    page: { first: LOG_PAGE_SIZE, offset: 0 },
    sort: [{ key: 'id', desc: true }],
  });
  const [logData] = createResource(
    () => JSON.stringify(variables()),
    async serialised => {
      const result = await graphqlFetch(
        StocktakeLog,
        JSON.parse(serialised) as StocktakeLogVariables
      );
      if (result.kind !== 'success') return undefined;
      return result.data.activityLogs;
    }
  );

  const rows = (): Log[] => logData.latest?.nodes ?? [];

  const columns = (): Column<Log, never>[] => [
    {
      c: { key: 'datetime' },
      header: t('label.date'),
      ...getDateCell(),
    },
    {
      c: { accessor: log => localisedTime(log.datetime), id: 'time' },
      header: t('label.time'),
      meta: { align: 'right' },
    },
    {
      c: { accessor: log => log.user?.username ?? '', id: 'user' },
      header: t('label.user'),
    },
    {
      c: { accessor: log => eventLabel(log.type), id: 'event' },
      header: t('label.event'),
    },
    {
      c: { id: 'details' },
      header: t('label.details'),
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
      />
    </Suspense>
  );
};
