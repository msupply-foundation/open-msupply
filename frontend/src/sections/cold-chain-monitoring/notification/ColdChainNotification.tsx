import { onCleanup, onMount, Show } from 'solid-js';
import type { Component } from 'solid-js';
import {
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from '@solidjs/router';
import { t } from '@/intl';
import { unauthenticated } from '@/auth/authContext';
import { hasPermission, hasVaccineModule } from '@/store/storeContext';
import { storePath, storeRelativePath } from '@/nav/storeRelativePath';
import { StandingBanner } from '@/ui/layout/Header/StandingBanner';
import { HStack } from '@/ui/layout/Stack/HStack';
import { Button } from '@/ui/elements/buttons/Button';
import { AlertCircleIcon } from '@/ui/icons';
import {
  formatDuration,
  formatTemperatureValue,
  hasTemperature,
} from '../monitoring/breachDisplay';
import { tabFromParam } from '../monitoring/monitoringState';
import {
  MONITORING_PATH,
  bandRow,
  detailsFilter,
  detailsTab,
  notificationGate,
  showsCount,
  viewDetailsWithheld,
  type BandRow,
} from './notificationLogic';
import {
  notifications,
  notificationsFailed,
  startNotificationPoll,
} from './notificationStore';
import styles from './ColdChainNotification.module.css';

// S5 — the cold-chain notification band (spec/cold-chain-monitoring rules ›
// the cold-chain notification; ui-surface S5): the standing row above EVERY
// screen while the store runs the vaccine module and something is outstanding.
// Mounted once by the shell (src/nav/ShellLayout.tsx), above the page, so the
// user sees an outstanding breach wherever they are working. Up to two rows —
// a breach row and an excursion row — each an instance of the app-bar
// standing-context banner; with nothing outstanding it renders nothing at all.
//
// The counts are the store's whole outstanding history, independent of the
// monitoring screen's filters (the query takes none — contract), so this
// band's number and the Breaches tab's row count legitimately differ.
//
// The two kinds are two FIXED blocks, not a list: each row is one stable
// banner whose text a poll updates in place, so the polite live region
// announces the change and a focused "View details" keeps its focus.

// How long ago an alert began — an elapsed span, since the headline copy
// supplies its own "ago".
const since = (start: string) =>
  formatDuration(start, new Date().toISOString());

/**
 * One row of the band. The row's elements, in the surface's order, divided
 * by separators: headline · temperature · device + location · count. The
 * temperature is shown wherever one is KNOWN — 0 °C included (rules ›
 * temperature display) — and the location only where there is one.
 */
const AlertRow: Component<{
  row: BandRow;
  /** The way through is withheld while the user is already on that tab. */
  withheld: boolean;
  onViewDetails: () => void;
}> = props => (
  <StandingBanner
    severity="error"
    icon={AlertCircleIcon}
    testId={`coldchain-notification-${props.row.kind}`}
    actions={
      <Show when={!props.withheld}>
        <Button
          variant="secondary"
          size="small"
          data-testid={`coldchain-notification-${props.row.kind}-details`}
          onClick={() => props.onViewDetails()}
        >
          {t('button.view-details')}
        </Button>
      </Show>
    }
  >
    <HStack gap="sm" wrap align="baseline">
      <strong>
        {t(
          props.row.kind === 'breach'
            ? 'messages.notification-breach-detected'
            : 'messages.notification-excursion-detected',
          { time: since(props.row.alert.startDatetime) }
        )}
      </strong>
      <Show when={hasTemperature(props.row.alert.maxOrMinTemperature)}>
        <span class={styles.item}>
          {t('messages.last-temperature', {
            temperature: formatTemperatureValue(
              props.row.alert.maxOrMinTemperature!
            ),
          })}
        </span>
      </Show>
      <span class={styles.item}>
        {t('messages.device')} <strong>{props.row.alert.sensor?.name}</strong>
        <Show when={props.row.alert.location}>
          {location => (
            <>
              {' '}
              {t('messages.location')} <strong>{location().name}</strong>
            </>
          )}
        </Show>
      </span>
      <Show when={showsCount(props.row.total)}>
        <span class={styles.item}>
          {t(
            props.row.kind === 'breach'
              ? 'messages.total-breaches'
              : 'messages.total-excursions',
            { count: props.row.total }
          )}
        </span>
      </Show>
    </HStack>
  </StandingBanner>
);

export const ColdChainNotification: Component = () => {
  const params = useParams<{ storeId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams<{ tab?: string }>();

  // The periodic re-read runs for as long as the band is mounted — the whole
  // signed-in session, since the shell mounts it.
  onMount(() => onCleanup(startNotificationPoll()));

  const gate = () => notificationGate(hasVaccineModule(), hasPermission);
  const breachRow = () => bandRow(notifications(), 'breach');
  const excursionRow = () => bandRow(notifications(), 'excursion');

  // Where the user is, for withholding a way through that would go nowhere.
  const current = () => ({
    relativePath: storeRelativePath(location.pathname, params.storeId),
    tab: tabFromParam(searchParams.tab),
  });

  // The way through: Monitoring, on the kind's tab, narrowed to the alert's
  // sensor. The state travels as the screen's own URL vocabulary
  // (list/urlQueryState — one `query` JSON parameter).
  const viewDetails = (row: BandRow) => {
    const query = JSON.stringify({ filter: detailsFilter(row.alert) });
    navigate(
      `${storePath(params.storeId, MONITORING_PATH)}?tab=${detailsTab[row.kind]}&query=${encodeURIComponent(query)}`
    );
  };

  return (
    <Show when={gate()}>
      {/* A failed re-read is reported, not silent — as a standing notice
          beside whatever the band last knew, rather than a toast (ui-standards
          › action feedback) — and suppressed while the session is gone, when
          it is unactionable (rules). */}
      <Show when={notificationsFailed() && !unauthenticated()}>
        <StandingBanner
          severity="warning"
          testId="coldchain-notification-error"
        >
          {t('error.fetch-notifications')}
        </StandingBanner>
      </Show>
      {/* Breach row first, then the excursion row (ui-surface S5). */}
      <Show when={breachRow()}>
        {row => (
          <AlertRow
            row={row()}
            withheld={viewDetailsWithheld('breach', current())}
            onViewDetails={() => viewDetails(row())}
          />
        )}
      </Show>
      <Show when={excursionRow()}>
        {row => (
          <AlertRow
            row={row()}
            withheld={viewDetailsWithheld('excursion', current())}
            onViewDetails={() => viewDetails(row())}
          />
        )}
      </Show>
    </Show>
  );
};
