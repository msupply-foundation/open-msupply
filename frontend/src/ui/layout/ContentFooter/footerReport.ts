import {
  createEffect,
  createSignal,
  on,
  onCleanup,
  type Accessor,
} from 'solid-js';
import { FLASH_MS } from '../../utils/createFlash';

/**
 * How long a non-persistent message stays before clearing itself: the shared
 * flash duration, long enough to read a short confirmation and gone before it
 * lingers.
 */
export const MESSAGE_FLASH_MS = FLASH_MS;

/** One outcome for the footer to report. */
export interface FooterMessage {
  /** Drives the chip's colour and glyph: green for success, red for error. */
  type: 'success' | 'error';
  /**
   * The words — for a success, the current app's save confirmation for the
   * record ("Shipment saved", "Saved"); for an error, the refusal.
   */
  text: string;
  /**
   * Stay until the caller replaces or clears it, instead of clearing itself
   * after MESSAGE_FLASH_MS. For the non-success states, which the user must
   * read before acting again (a refused advance stays until the next attempt).
   */
  persistent?: boolean;
}

export interface FooterReport {
  /**
   * The message on screen. It outlives its report by the chip's exit: when the
   * report ends it stays, `leaving`, until `exited()`.
   */
  shown: Accessor<FooterMessage | undefined>;
  /** The report has ended and the chip is playing its exit. */
  leaving: Accessor<boolean>;
  /**
   * The exit has played: remove the chip. Ignored unless it is `leaving`, so a
   * chip's entrance ending (or a report that replaced it) never removes it.
   */
  exited: () => void;
}

/*
 * The timing behind ContentFooterMessage, kept apart from its markup so it can
 * be tested without a DOM (the solid vitest project renders none).
 *
 * - Each NEW message object is a new report: it shows at once, replacing any
 *   chip on screen, mid-exit or not.
 * - A non-persistent report ends by itself after MESSAGE_FLASH_MS; a
 *   persistent one ends when the caller clears it (undefined).
 * - The self-clear timer belongs to the report that started it: a new report
 *   or unmount cancels it, so it never ends a chip it did not start.
 */
export const createFooterReport = (
  message: Accessor<FooterMessage | undefined>
): FooterReport => {
  const [shown, setShown] = createSignal<FooterMessage>();
  const [leaving, setLeaving] = createSignal(false);

  let timer: ReturnType<typeof setTimeout> | undefined;
  const stopTimer = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  };
  onCleanup(stopTimer);

  createEffect(
    on(message, next => {
      stopTimer();
      if (next) {
        setShown(next);
        setLeaving(false);
        if (!next.persistent)
          timer = setTimeout(() => {
            timer = undefined;
            setLeaving(true);
          }, MESSAGE_FLASH_MS);
      } else if (shown()) setLeaving(true);
    })
  );

  return {
    shown,
    leaving,
    exited: () => {
      if (!leaving()) return;
      setShown(undefined);
      setLeaving(false);
    },
  };
};
