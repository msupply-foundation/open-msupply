import {
  createEffect,
  createMemo,
  createResource,
  createRoot,
  createSignal,
} from 'solid-js';
import { graphqlFetch } from '@/api/graphql';
import { gated } from '@/api/gated';
import { sameFetchedValue } from '@/typeHelpers';
import {
  currentStoreId,
  hasPermission,
  hasVaccineModule,
} from '@/store/storeContext';
import { TemperatureNotifications } from '../monitoring.generated';
import {
  POLL_INTERVAL_MS,
  notificationGate,
  type NotificationData,
} from './notificationLogic';

// The notification band's data — resource-signal global state
// (kdd/state-management), module-level so the band that shows it and the
// acknowledgement that changes it can both reach it by direct call: the modal
// calls `refetchNotifications()` after a save and the count falls without
// waiting for the poll (rules › acknowledging a breach: "the store's
// outstanding-breach count falls by one").
//
// Built lazily inside a createRoot on first use (the createStoreScopedResource
// shape), keyed on the active store, so a store switch refetches and nothing is
// fetched before something reads it. The source is undefined — no fetch at all
// — while the gate fails: the read requires TEMPERATURE_BREACH_QUERY, and a
// user without it must never have the query issued for them (it would trip the
// global permission-denied modal on every screen they open).

type Fetched =
  | { ok: true; data: NotificationData }
  | { ok: false; unauthenticated: boolean };

type Store = {
  /** The last successfully loaded digest; undefined until one lands. */
  notifications: () => NotificationData | undefined;
  /** The latest read failed for a reason other than a lost session. */
  failed: () => boolean;
  refetch: () => void;
};

let instance: Store | undefined;

const build = (): Store =>
  createRoot(() => {
    const source = () =>
      notificationGate(hasVaccineModule(), hasPermission)
        ? currentStoreId()
        : undefined;

    const [resource, { refetch }] = createResource(
      source,
      async (storeId): Promise<Fetched> => {
        // `background`: a failed poll returns a failure to report in the band
        // (rules: "a failed re-read is reported"), never the global
        // unexpected-error modal — a transient outage would otherwise convert
        // a self-retrying poll into a forced reload. An unauthenticated result
        // still reports globally (the re-login modal), which is why the band
        // then stays quiet: unactionable twice over.
        const result = await graphqlFetch(
          TemperatureNotifications,
          { storeId },
          { background: true }
        );
        return result.kind === 'success'
          ? { ok: true, data: result.data.temperatureNotifications }
          : { ok: false, unauthenticated: result.kind === 'unauthenticated' };
      }
    );

    // The last good digest is HELD across a failed re-read — the band keeps
    // stating what it last knew and adds the failure notice beside it — so it
    // is state, not a derivation a memo could express; hence an effect.
    // graphqlFetch's structural sharing hands an unchanged response back as the
    // same object, so an unchanged poll writes the same reference and the
    // signal dedupes it (kdd/solid-reactivity-pitfalls §16).
    const [lastGood, setLastGood] = createSignal<NotificationData>();
    const [failed, setFailed] = createSignal(false);
    createEffect(() => {
      const fetched = gated(resource);
      if (!fetched) return;
      if (fetched.ok) {
        setLastGood(fetched.data);
        setFailed(false);
      } else setFailed(!fetched.unauthenticated);
    });
    // A gate that closes (store switch, permission lost) clears the band.
    createEffect(() => {
      if (source() === undefined) {
        setLastGood(undefined);
        setFailed(false);
      }
    });

    // An owned memo with the equal-data boundary (kdd/solid-reactivity-
    // pitfalls §16), so consumers are never notified for an unchanged digest.
    const notifications = createMemo(() => lastGood(), undefined, {
      equals: sameFetchedValue,
    });

    return {
      notifications,
      failed,
      refetch: () => void refetch(),
    };
  });

const store = (): Store => (instance ??= build());

/** The store's outstanding digest — undefined before the first read lands. */
export const notifications = (): NotificationData | undefined =>
  store().notifications();

/** The latest re-read failed (and the session is still live). */
export const notificationsFailed = (): boolean => store().failed();

/**
 * Re-read now — after an acknowledgement, so the band's count falls without
 * waiting for the poll. A never-read store simply loads on its first read.
 */
export const refetchNotifications = (): void => instance?.refetch();

/**
 * The periodic re-read (rules: "the band re-reads periodically") — an
 * interval for as long as the band is mounted. Returns the stop function.
 */
export const startNotificationPoll = (): (() => void) => {
  const handle = setInterval(() => store().refetch(), POLL_INTERVAL_MS);
  return () => clearInterval(handle);
};
