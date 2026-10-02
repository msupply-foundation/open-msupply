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

/** The shell's side: forward one router event to every listener. */
export const dispatchHostBeforeLeave = (event: HostLeaveEvent): void => {
  for (const listener of [...listeners]) listener(event);
};
