/*
 * The route-leave hook for code with no router context — the plugin SDK's
 * `onBeforeLeave` (spec/plugins/sdk-contract.md § SDK surface — navigation),
 * on the same one-writer/one-reader binding as hostNavigate.ts: ShellLayout
 * subscribes to the router's `useBeforeLeave` once and forwards every event
 * here; a plugin page registers a listener for the life of its owner and
 * never meets `@solidjs/router`. The Afghanistan Daily Tally's leave guard
 * (save first, prompt only when that fails) is the first consumer.
 */
import { getOwner, onCleanup } from 'solid-js';

/** A route navigation about to happen, as the router reports it. */
export interface HostLeaveEvent {
  /**
   * The destination's pathname; undefined for a history delta (Back/Forward).
   */
  readonly toPathname: string | undefined;
  readonly fromPathname: string;
  readonly defaultPrevented: boolean;
  /** Hold the navigation; `retry(true)` later replays it past every guard. */
  preventDefault(): void;
  retry(force?: boolean): void;
}

export type HostLeaveListener = (event: HostLeaveEvent) => void;

const listeners = new Set<HostLeaveListener>();

/**
 * Listen for route leaves for the lifetime of the CALLING COMPONENT — a call
 * without an owner is refused and reported, as bindHostNavigate's is, so a
 * listener nothing releases can never outlive its screen.
 */
export const onHostBeforeLeave = (listener: HostLeaveListener): void => {
  if (getOwner() === null) {
    console.error(
      'onHostBeforeLeave: called outside a component body — nothing would ever release the listener, so it was not added'
    );
    return;
  }
  listeners.add(listener);
  onCleanup(() => listeners.delete(listener));
};

/**
 * The shell's side: forward one router event to every listener.
 *
 * A listener that throws is contained, like every other plugin callback the
 * host invokes (spec/plugins/rules.md § error isolation): uncontained, the
 * throw would propagate out of the router's `useBeforeLeave` handler and abort
 * the host's own navigation, and the listeners after it would never run. If
 * the thrower is also the one that held the navigation, the hold is released —
 * it cannot be trusted to retry, and a held navigation nothing will ever
 * replay leaves the app unable to move.
 */
export const dispatchHostBeforeLeave = (event: HostLeaveEvent): void => {
  for (const listener of [...listeners]) {
    const heldBefore = event.defaultPrevented;
    try {
      listener(event);
    } catch (thrown) {
      console.error(
        'onHostBeforeLeave: a route-leave listener threw and was ignored',
        thrown
      );
      if (!heldBefore && event.defaultPrevented) event.retry(true);
    }
  }
};
