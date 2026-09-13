import { createMemo, createResource, createSignal, For, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { graphqlFetch } from '@/api/graphql';
import { gated } from '@/api/gated';
import { localisedDate, t } from '@/intl';
import { Stack } from '@/ui/layout/Stack/Stack';
import { ContentContainer } from '@/ui/layout/ContentContainer/ContentContainer';
import { HStack } from '@/ui/layout/Stack/HStack';
import { Text } from '@/ui/elements/typography/Text';
import { DateField } from '@/ui/elements/inputs/DateField';
import { Select } from '@/ui/elements/selectors/Select';
import { StatusChip } from '@/ui/elements/feedback/StatusChip';
import { EmptyState } from '@/ui/elements/feedback/EmptyState';
import { Spinner } from '@/ui/elements/feedback/Spinner';
import { Timeline, TimelineItem } from '@/ui/elements/display/Timeline';
import { SettingsIcon, UserIcon } from '@/ui/icons';
import { DetailCard } from '@/ui/layout/Detail/DetailCard';
import { DetailSection } from '@/ui/layout/Detail/DetailSection';
import { DetailRow } from '@/ui/layout/Detail/DetailRow';
import { UserLabel } from '@/ui/elements/typography/UserLabel';
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
// Entries are never edited and never deleted (OMS-REG-CCE-06.29) — there is no mutation
// for either anywhere in the schema, so there is no affordance to withhold.

export interface StatusHistoryTabProps {
  storeId: string;
  assetId: string;
  /** Only a cold room records mappings, so only it offers that kind (OMS-REG-CCE-06.38). */
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
    // The page is fillBody for its table tabs, so the timeline brings the body
    // padding it would otherwise inherit.
    <ContentContainer size="wide" padded>
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
            <Timeline testId="status-history-timeline">
              <For each={logs()}>{log => <LogEntry log={log} />}</For>
            </Timeline>
          </Show>
        </Show>
      </Stack>
    </ContentContainer>
  );
};

/**
 * One entry — a card on the timeline's rail (ui-surface S2.3): a marker joined
 * to the entries above and below, and the entry's own record beside it.
 *
 * The marker's glyph says WHO recorded it: a system glyph for the entries the
 * server writes itself (the import's synthetic mapping entries), a person for
 * everything a user did.
 *
 * The card is the registry's role for several records of the same kind stacked
 * as cards. Its title is the entry's date and its header-end action the status
 * — or, for a temperature mapping, a neutral chip naming the kind, because a
 * mapping carries no status at all (rules › temperature mapping).
 */
const SYSTEM_USER = 'omsupply_system';

const LogEntry: Component<{ log: AssetLogRowFragment }> = props => {
  const status = () => props.log.status;
  const bySystem = () => props.log.user?.username === SYSTEM_USER;
  return (
    <TimelineItem icon={bySystem() ? <SettingsIcon /> : <UserIcon />}>
      <DetailCard
        // A hairline, not a shadow: a history is a long uniform run of cards,
        // and a shadow per entry stacks into noise down the rail.
        surface="bordered"
        title={localisedDate(props.log.logDatetime)}
        actions={
          <>
            <Show when={status()}>
              {value => (
                <StatusChip
                  label={t(statusLabelKey(value()))}
                  colour={statusColour(value())}
                />
              )}
            </Show>
            <Show when={isMapping(props.log)}>
              <StatusChip
                label={t('label.temperature-mapping')}
                colour="var(--gray-main)"
              />
            </Show>
          </>
        }
      >
        <DetailSection>
          {/* The recorded user, through the shared role — a hand-rolled
            name-and-icon pair is a bespoke look-alike (registry § recorded
            user). */}
          <DetailRow
            label={t('label.user')}
            align="start"
            control={
              <UserLabel
                username={props.log.user?.username}
                label={t('label.user')}
              />
            }
          />
          {/* Plain text through the `control` slot, NOT the `value` prop: a
            never-editable field renders as text and never as a disabled input
            (ui-standards/detail-views § never-editable fields), and DetailRow's
            `value` puts one in a disabled TextField. An empty one shows a dash
            — beside a label, blank reads as a rendering fault. */}
          <DetailRow
            label={t('label.reason')}
            align="start"
            control={<Text>{props.log.reason?.reason ?? ABSENT}</Text>}
          />
          <DetailRow
            label={t('label.observations')}
            align="start"
            full
            control={<Text>{props.log.comment ?? ABSENT}</Text>}
          />
          {/* The entry's own files, attached when it was recorded and not
            changeable afterwards (rules › documents, OMS-REG-CCE-06.45). */}
          <Show when={props.log.documents.nodes.length > 0}>
            <DetailRow
              label={t('label.documents')}
              align="start"
              full
              control={
                <Stack>
                  <For each={props.log.documents.nodes}>
                    {document => (
                      <a
                        href={syncFileUrl(
                          'asset_log',
                          props.log.id,
                          document.id
                        )}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {document.fileName}
                      </a>
                    )}
                  </For>
                </Stack>
              }
            />
          </Show>
        </DetailSection>
      </DetailCard>
    </TimelineItem>
  );
};

/** The picked day's first instant, in the user's own zone. */
const startOfLocalDay = (date: string): string =>
  new Date(`${date}T00:00:00`).toISOString();

/** The picked day's inclusive last instant, in the user's own zone. */
const endOfLocalDay = (date: string): string =>
  new Date(`${date}T23:59:59.999`).toISOString();
