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
  InboundShipmentLog,
  type InboundLogFragment,
  type InboundShipmentLogVariables,
} from './inboundShipmentLog.generated';

// The inbound-shipment detail "Log" tab: activity-log entries recorded against
// THIS shipment. Read-only, non-paginated (append-only + short per record).
// Mirrors StocktakeLogPanel exactly — its own query, independent of the header
// + line-table resources.
type Log = InboundLogFragment;

const LOG_PAGE_SIZE = 1000;

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

export const InboundShipmentLogPanel: Component<{
  storeId: string;
  invoiceId: string;
}> = props => {
  const variables = (): InboundShipmentLogVariables => ({
    storeId: props.storeId,
    recordId: props.invoiceId,
    page: { first: LOG_PAGE_SIZE, offset: 0 },
    sort: [{ key: 'id', desc: true }],
  });
  const [logData] = createResource(
    () => JSON.stringify(variables()),
    async serialised => {
      const result = await graphqlFetch(
        InboundShipmentLog,
        JSON.parse(serialised) as InboundShipmentLogVariables
      );
      if (result.kind !== 'success') return undefined;
      return result.data.activityLogs;
    }
  );

  const rows = (): Log[] => logData.latest?.nodes ?? [];

  const columns = (): Column<Log, never>[] => [
    { c: { key: 'datetime' }, header: t('label.date'), ...getDateCell() },
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
