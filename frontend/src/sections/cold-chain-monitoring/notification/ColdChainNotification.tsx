import { For, onCleanup, onMount, Show } from 'solid-js';
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
  bandRows,
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

export const ColdChainNotification: Component = () => {
  const params = useParams<{ storeId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams<{ tab?: string }>();

  // The periodic re-read runs for as long as the band is mounted — the whole
  // signed-in session, since the shell mounts it.
  onMount(() => onCleanup(startNotificationPoll()));

  const gate = () => notificationGate(hasVaccineModule(), hasPermission);
  const rows = () => bandRows(notifications());

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

  // How long ago the alert began — an elapsed span, since the headline copy
  // supplies its own "ago".
  const since = (start: string) =>
    formatDuration(start, new Date().toISOString());

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
      <For each={rows()}>
        {row => (
          <StandingBanner
            severity="error"
            icon={AlertCircleIcon}
            testId={`coldchain-notification-${row.kind}`}
            actions={
              <Show when={!viewDetailsWithheld(row.kind, current())}>
                <Button
                  variant="secondary"
                  size="small"
                  data-testid={`coldchain-notification-${row.kind}-details`}
                  onClick={() => viewDetails(row)}
                >
                  {t('button.view-details')}
                </Button>
              </Show>
            }
          >
            {/* The row's elements, in the surface's order, divided by
                separators: headline · temperature · device + location · count.
                The temperature is shown wherever one is KNOWN — 0 °C included
                (rules › temperature display) — and the location only where
                there is one. */}
            <span class={styles.row}>
              <strong>
                {t(
                  row.kind === 'breach'
                    ? 'messages.notification-breach-detected'
                    : 'messages.notification-excursion-detected',
                  { time: since(row.alert.startDatetime) }
                )}
              </strong>
              <Show when={hasTemperature(row.alert.maxOrMinTemperature)}>
                <span class={styles.item}>
                  {t('messages.last-temperature', {
                    temperature: formatTemperatureValue(
                      row.alert.maxOrMinTemperature!
                    ),
                  })}
                </span>
              </Show>
              <span class={styles.item}>
                {t('messages.device')} <strong>{row.alert.sensor?.name}</strong>
                <Show when={row.alert.location}>
                  {location => (
                    <>
                      {' '}
                      {t('messages.location')}{' '}
                      <strong>{location().name}</strong>
                    </>
                  )}
                </Show>
              </span>
              <Show when={showsCount(row.total)}>
                <span class={styles.item}>
                  {t(
                    row.kind === 'breach'
                      ? 'messages.total-breaches'
                      : 'messages.total-excursions',
                    { count: row.total }
                  )}
                </span>
              </Show>
            </span>
          </StandingBanner>
        )}
      </For>
    </Show>
  );
};
