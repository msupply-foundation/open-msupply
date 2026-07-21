import { createSignal } from 'solid-js';
import { graphqlFetch } from './graphql';
import type { SyncStatusFragment } from './initialisation.generated';
import {
  ManualSync,
  SyncInfoUpdated,
  SyncStatusAndQueue,
} from './initialisation.generated';
import { subscribe } from './subscription';
import { checkAuth } from '../auth/authContext';
import { refetchStoreContext, currentStoreId } from '../store/storeContext';
import { masterListsResource } from '../domain/masterList/masterListResource';
import { invalidateCustomTranslations } from '../intl';

// The shared operational sync-status source (substrate: consumed by the app
// chrome's sync indicator and the sync-modal vertical — spec/sync-modal
// › contract § Substrate). One subscription fanned out to every consumer,
// polling only while the live channel is down; the initialisation screen is
// pre-session and runs its own poll instead.
//
// The store exposes the RAW status fragment: which phases a surface displays
// (the phase-visibility matrix) is the sync-modal vertical's rule, generated
// from spec — not baked in here.

const [syncStatus, setSyncStatus] = createSignal<SyncStatusFragment>();
// Records to push. Fed by the subscription (current-run remaining work) or, on
// the polling fallback, by the query — which is a DIFFERENT derivation that
// never drains on a current-generation site. Captured wire trap:
// spec/sync-modal/contract.md § Records to push.
const [pushQueueCount, setPushQueueCount] = createSignal<number>();
// Whether the live channel is delivering; consumers poll only while it isn't.
const [liveConnected, setLiveConnected] = createSignal(false);

export { syncStatus, pushQueueCount, liveConnected };

const RECONNECT_BASE_MS = 1_000;
const RECONNECT_MAX_MS = 30_000;

let watching = false;
let disposeSubscription: (() => void) | undefined;
let reconnectTimer: number | undefined;
let reconnectDelay = RECONNECT_BASE_MS;
let wasSyncing = false;

// Spec (sync-modal › After a run completes; AC-R1): when a run observed while
// the app is open completes, re-read the session user (store list), the
// entered store's preferences + permissions, the shared caches, and custom
// translations — by direct call (kdd/explicit-composition), no re-login.
// Locations are NOT a shared cache anymore — each view fetches them locally (a
// fresh view mount re-reads, and the stocktake detail view refetches after every
// line save), so there is no global locations cache to refresh here.
const onRunCompleted = () => {
  void checkAuth();
  if (currentStoreId() != null) void refetchStoreContext(currentStoreId());
  void masterListsResource.refetch();
  void invalidateCustomTranslations();
};

const handleStatus = (status: SyncStatusFragment | null | undefined) => {
  if (status == null) return;
  setSyncStatus(status);
  if (wasSyncing && !status.isSyncing) onRunCompleted();
  wasSyncing = status.isSyncing;
};

const connect = () => {
  if (!watching) return;
  disposeSubscription = subscribe(SyncInfoUpdated, undefined, {
    // The transport acknowledgement proves the channel — NOT the first
    // delivery: the server only pushes on change, so a healthy subscription
    // on a quiet site delivers nothing, and consumers must stop their
    // fallback polling as soon as the channel is up (the sync modal would
    // otherwise poll for its whole lifetime).
    onEstablished: () => {
      reconnectDelay = RECONNECT_BASE_MS;
      setLiveConnected(true);
    },
    onData: data => {
      // The delivery counter invalidates any in-flight fallback poll (see
      // below).
      liveDeliveries++;
      setLiveConnected(true);
      setPushQueueCount(data.syncInfoUpdated.numberOfRecordsInPushQueue);
      handleStatus(data.syncInfoUpdated.syncStatus);
    },
    onFailure: () => {
      // The transport is fail-once; reconnection lives here. Spec (sync-modal ›
      // The modal's status display): an interruption must not degrade live
      // updates for the rest of the session.
      setLiveConnected(false);
      disposeSubscription?.();
      disposeSubscription = undefined;
      if (!watching) return;
      reconnectTimer = window.setTimeout(connect, reconnectDelay);
      reconnectDelay = Math.min(reconnectDelay * 2, RECONNECT_MAX_MS);
    },
  });
};

// Idempotent; the shell starts the watch once a session exists (the
// subscription authenticates via the session cookie) and stops it on teardown.
export const startSyncWatch = (): void => {
  if (watching) return;
  watching = true;
  connect();
};

export const stopSyncWatch = (): void => {
  watching = false;
  if (reconnectTimer != null) clearTimeout(reconnectTimer);
  reconnectTimer = undefined;
  disposeSubscription?.();
  disposeSubscription = undefined;
  setLiveConnected(false);
};

// One poll of status + count — the fallback consumers run on an interval while
// the live channel is down and their surface is visible. `background` keeps a
// failed poll out of the global unexpected-error modal (the next tick — or the
// reconnecting live channel — retries), and a response that lands after the
// live channel has resumed is dropped: the subscription only pushes on change,
// so a stale poll result would otherwise stick until the next run.
let pollGeneration = 0;
let liveDeliveries = 0;
export const pollSyncStatus = async (): Promise<void> => {
  const generation = ++pollGeneration;
  const deliveriesAtStart = liveDeliveries;
  const result = await graphqlFetch(
    SyncStatusAndQueue,
    {},
    { background: true }
  );
  if (result.kind !== 'success') return;
  // Superseded by a newer poll, or by a live frame that arrived meanwhile.
  if (generation !== pollGeneration || liveDeliveries !== deliveriesAtStart)
    return;
  setPushQueueCount(result.data.numberOfRecordsInPushQueue);
  handleStatus(result.data.latestSyncStatus);
};

// Spec (sync-modal › Viewing and triggering): fire-and-forget — acknowledged
// immediately, the run reports through the status stream; triggering during a
// run is a no-op server-side. Unexpected failures surface globally; the
// returned flag only lets the trigger control release its busy state.
export const triggerSync = async (): Promise<boolean> => {
  const result = await graphqlFetch(ManualSync, {});
  return result.kind === 'success';
};
