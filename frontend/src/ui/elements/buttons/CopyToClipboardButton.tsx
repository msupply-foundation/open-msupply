import { createSignal, onCleanup, splitProps } from 'solid-js';
import { t } from '../../../intl';
import { CheckIcon, CopyIcon } from '../../icons';
import { Button, type ButtonProps } from './Button';

/*
 * The shared "Copy to clipboard" record action (spec/ui-standards/controls.md
 * § copy to clipboard). One control for every detail screen that offers it, so
 * the three parts of that rule hold in one place instead of six:
 *
 *  - the WHOLE record goes on the clipboard as indented JSON — the caller's
 *    `load` supplies it (a plain node it already holds, or its own unpaginated
 *    fetch where the row table is server-paged); this component owns the
 *    serialisation, not the caller;
 *  - it is a read, so it is never gated on status or mutate permission — there
 *    is deliberately no `disabled` in the contract below;
 *  - the outcome is reported IN PLACE (controls § action feedback — never a
 *    toast): the button briefly swaps its label/icon to "copied" or "failed",
 *    then reverts.
 *
 * `load` returning `undefined` means "nothing to copy" (a failed or
 * unexpectedly-shaped fetch, already surfaced by the data layer's own error
 * routing) — the button reverts silently rather than claiming a copy.
 */

const FEEDBACK_MS = 2000;

export interface CopyToClipboardButtonProps extends Omit<
  ButtonProps,
  'variant' | 'icon' | 'children' | 'loading'
> {
  /**
   * Supplies the whole record to serialise — awaited, so it may be its own
   * unpaginated fetch. `undefined` copies nothing.
   */
  load: () => unknown | Promise<unknown>;
  /**
   * JSON indent width. Two spaces unless a vertical's contract fixes another.
   */
  indent?: number;
}

export const CopyToClipboardButton = (props: CopyToClipboardButtonProps) => {
  const [local, rest] = splitProps(props, ['load', 'indent']);

  // busy while `load` is in flight; feedback for a moment after the write
  // settles (drives the label/icon swap).
  const [busy, setBusy] = createSignal(false);
  const [feedback, setFeedback] = createSignal<'copied' | 'failed'>();
  let timer: ReturnType<typeof setTimeout> | undefined;
  onCleanup(() => clearTimeout(timer));
  const flash = (kind: 'copied' | 'failed') => {
    setFeedback(kind);
    clearTimeout(timer);
    timer = setTimeout(() => setFeedback(undefined), FEEDBACK_MS);
  };

  const run = async () => {
    if (busy()) return; // re-entry guard
    setBusy(true);
    try {
      let record: unknown;
      try {
        record = await local.load();
      } catch {
        // A throwing supplier (the app's own fetches don't throw — they return
        // a discriminated result — but a serialisation or transport surprise
        // must still be reported, not swallowed as a dead click).
        flash('failed');
        return;
      }
      if (record === undefined) return;
      try {
        await navigator.clipboard.writeText(
          JSON.stringify(record, null, local.indent ?? 2)
        );
      } catch {
        // Clipboard write refused — e.g. Safari's user-activation window
        // expired over a slow fetch. Reported in the same in-place slot.
        flash('failed');
        return;
      }
      flash('copied');
    } finally {
      setBusy(false);
    }
  };

  return (
    // aria-live so the label swap is announced by assistive tech (no
    // visually-hidden twin — a hidden duplicate of the label trips strict e2e
    // text locators).
    <Button
      variant="secondary"
      aria-live="polite"
      icon={feedback() === 'copied' ? <CheckIcon /> : <CopyIcon />}
      loading={busy()}
      data-testid="copy-to-clipboard-button"
      {...rest}
      onClick={() => void run()}
    >
      {feedback() === 'copied'
        ? t('message.copy-success')
        : feedback() === 'failed'
          ? t('message.copy-failed')
          : t('link.copy-to-clipboard')}
    </Button>
  );
};
