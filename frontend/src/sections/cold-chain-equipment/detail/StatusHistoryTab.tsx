import { createMemo, createResource, createSignal, For, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { graphqlFetch } from '@/api/graphql';
import { gated } from '@/api/gated';
import { localisedDate, t } from '@/intl';
import { Stack } from '@/ui/layout/Stack/Stack';
import { HStack } from '@/ui/layout/Stack/HStack';
import { Text } from '@/ui/elements/typography/Text';
import { DateField } from '@/ui/elements/inputs/DateField';
import { Select } from '@/ui/elements/selectors/Select';
import { StatusChip } from '@/ui/elements/feedback/StatusChip';
import { EmptyState } from '@/ui/elements/feedback/EmptyState';
import { Spinner } from '@/ui/elements/feedback/Spinner';
import { LabelledValue } from '@/ui/elements/typography/LabelledValue';
import { syncFileUrl } from '@/domain/syncFiles';
import {
  ABSENT,
  ASSET_STATUSES,
  statusColour,
  statusLabelKey,
} from '../equipment';
import { AssetLogsList } from '../equipment.generated';
import type { AssetLogRowFragment } from '../equipment.generated';
import { isMapping, logKindFilter, type LogEventFilter } from './statusLog';

// S2.3 — the Status history tab (ui-surface S2.3): the machine's condition over
// time, newest first, with the temperature mappings alongside where the asset
// records them.
//
// Entries are never edited and never deleted (AC-FS12) — there is no mutation
// for either anywhere in the schema, so there is no affordance to withhold.

export interface StatusHistoryTabProps {
  storeId: string;
  assetId: string;
  /** Only a cold room records mappings, so only it offers that kind (AC-M8). */
  isColdRoom: boolean;
}

export const StatusHistoryTab: Component<StatusHistoryTabProps> = props => {
  const [fromDate, setFromDate] = createSignal('');
  const [toDate, setToDate] = createSignal('');
  const [kind, setKind] = createSignal<LogEventFilter>('all');

  const variables = createMemo(() => ({
    storeId: props.storeId,
    filter: {
      assetId: { equalTo: props.assetId },
      ...logKindFilter(kind(), ASSET_STATUSES),
      // Each picked day is the DEVICE-LOCAL day, widened to instants
      // (ui-standards/inputs § timezone authority).
      ...(fromDate() || toDate()
        ? {
            logDatetime: {
              ...(fromDate()
                ? { afterOrEqualTo: startOfLocalDay(fromDate()) }
                : {}),
              ...(toDate() ? { beforeOrEqualTo: endOfLocalDay(toDate()) } : {}),
            },
          }
        : {}),
    },
    sort: [{ key: 'logDatetime' as const, desc: true }],
  }));

  // Read non-suspending: this tab first fetches when it is opened, under an
  // already-open screen's boundary (kdd/solid-reactivity-pitfalls § no
  // remounts).
  const [data] = createResource(
    () => JSON.stringify(variables()),
    async serialised => {
      const result = await graphqlFetch(
        AssetLogsList,
        JSON.parse(serialised) as ReturnType<typeof variables>
      );
      return result.kind === 'success' ? result.data.assetLogs : undefined;
    }
  );
  const logs = (): AssetLogRowFragment[] => gated(data)?.nodes ?? [];

  const kindOptions = () => [
    { value: 'all', label: t('label.all') },
    { value: 'status', label: t('label.status-change') },
    ...(props.isColdRoom
      ? [{ value: 'mapping', label: t('label.temperature-mapping') }]
      : []),
  ];

  return (
    <Stack>
      <HStack gap="md" wrap>
        <DateField
          label={t('label.from-date')}
          width="short"
          value={fromDate() || null}
          onChange={value => setFromDate(value ?? '')}
        />
        <DateField
          label={t('label.to-date')}
          width="short"
          value={toDate() || null}
          onChange={value => setToDate(value ?? '')}
        />
        <Select
          label={t('label.event')}
          width="short"
          testId="log-event-select"
          value={kind()}
          options={kindOptions()}
          onValueChange={value => setKind(value as LogEventFilter)}
        />
      </HStack>

      <Show when={!data.loading} fallback={<Spinner />}>
        <Show
          when={logs().length > 0}
          fallback={
            <EmptyState
              message={t('messages.no-status-logs')}
              data-testid="nothing-here"
            />
          }
        >
          <Stack>
            <For each={logs()}>{log => <LogEntry log={log} />}</For>
          </Stack>
        </Show>
      </Show>
    </Stack>
  );
};

/**
 * One entry. Its status reads as a toned chip — or, for a temperature mapping,
 * a neutral chip naming the kind, because a mapping carries no status at all
 * (rules › temperature mapping).
 */
const LogEntry: Component<{ log: AssetLogRowFragment }> = props => {
  const fullName = () =>
    [props.log.user?.firstName, props.log.user?.lastName]
      .filter(Boolean)
      .join(' ');

  return (
    <Stack>
      <HStack gap="md" align="center" wrap>
        <Text variant="subtitle">{localisedDate(props.log.logDatetime)}</Text>
        <Show when={props.log.status}>
          {status => (
            <StatusChip
              label={t(statusLabelKey(status()))}
              colour={statusColour(status())}
            />
          )}
        </Show>
        <Show when={isMapping(props.log)}>
          <StatusChip
            label={t('label.temperature-mapping')}
            colour="var(--gray-main)"
          />
        </Show>
      </HStack>
      <HStack gap="md" wrap>
        <LabelledValue size="small" layout="inline" label={t('label.user')}>
          {props.log.user?.username ?? ABSENT}
        </LabelledValue>
        <Show when={fullName()}>
          {name => (
            <LabelledValue size="small" layout="inline" label={t('label.name')}>
              {name()}
              <Show when={props.log.user?.jobTitle}>
                {title => <>, {title()}</>}
              </Show>
            </LabelledValue>
          )}
        </Show>
      </HStack>
      <LabelledValue size="small" layout="inline" label={t('label.reason')}>
        {props.log.reason?.reason ?? ABSENT}
      </LabelledValue>
      <LabelledValue size="small" layout="inline" label={t('label.observations')}>
        {props.log.comment ?? ABSENT}
      </LabelledValue>
      {/* The entry's own files, attached when it was recorded and not
          changeable afterwards (rules › documents, AC-FS13). */}
      <Show when={props.log.documents.nodes.length > 0}>
        <Stack>
          <For each={props.log.documents.nodes}>
            {document => (
              <a
                href={syncFileUrl('asset_log', props.log.id, document.id)}
                target="_blank"
                rel="noreferrer"
              >
                {document.fileName}
              </a>
            )}
          </For>
        </Stack>
      </Show>
    </Stack>
  );
};

/** The picked day's first instant, in the user's own zone. */
const startOfLocalDay = (date: string): string =>
  new Date(`${date}T00:00:00`).toISOString();

/** The picked day's inclusive last instant, in the user's own zone. */
const endOfLocalDay = (date: string): string =>
  new Date(`${date}T23:59:59.999`).toISOString();
