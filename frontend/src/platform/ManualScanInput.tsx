import { createEffect, createSignal, Show } from 'solid-js';
import { TextField } from '../ui/elements/inputs/TextField';
import { Button } from '../ui/elements/buttons/Button';
import { t } from '../intl';
import { stopListening } from './barcodeScanner';
import {
  cancelManualScan,
  manualPromptMode,
  manualPromptOpen,
  submitManualScan,
} from './barcodeSources/manual';
import styles from './ManualScanInput.module.css';

// The typed stand-in for a scanner (spec/settings/rules.md § Devices —
// barcode scanner). Mounted ONCE, app-wide, in App.tsx: manual input can be
// triggered from any screen that scans, and the prompt belongs to the device
// rather than to whichever screen happens to be asking.
//
// Renders nothing unless the manual source has opened the prompt, so the
// mount costs one signal read on every other render.
export const ManualScanInput = () => {
  const [value, setValue] = createSignal('');
  let panel: HTMLDivElement | undefined;
  let input: HTMLInputElement | undefined;

  // The top layer is entered by showPopover(), not by CSS, so the open signal
  // has to drive it imperatively. Both calls throw if the element is already
  // in the requested state (a double-open, or a UA-dismissed panel we then
  // ask to hide), and neither case is worth failing on.
  createEffect(() => {
    const open = manualPromptOpen();
    if (!panel) return;
    try {
      if (open) {
        panel.showPopover();
        setValue('');
        input?.focus();
      } else {
        panel.hidePopover();
      }
    } catch {
      /* already in that state */
    }
  });

  const submit = () => {
    const raw = value();
    if (raw === '') return;
    submitManualScan(raw);
    // While armed the prompt stays open for the next scan, so clear and keep
    // the caret here — the rhythm being stood in for is box after box.
    setValue('');
    input?.focus();
  };

  const dismiss = () => {
    // A one-shot has a promise waiting on it, which only the source can
    // settle; an armed source is the wrapper's to release, because ownership
    // of the scan lives there. Direct calls to each rather than one
    // do-the-right-thing helper, so both paths stay traceable.
    if (manualPromptMode() === 'listening') void stopListening();
    else cancelManualScan();
  };

  return (
    <div ref={panel} popover="manual" class={styles.panel}>
      <Show when={manualPromptOpen()}>
        <p class={styles.heading}>{t('settings.barcode-scanner')}</p>
        <TextField
          ref={input}
          label={t('label.enter-barcode')}
          value={value()}
          autofocus
          data-testid="manual-scan-input"
          onInput={e => setValue(e.currentTarget.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              submit();
            }
            // Escape would otherwise be swallowed by the panel; dismissing
            // has to settle a pending one-shot, not just hide the element.
            if (e.key === 'Escape') {
              e.preventDefault();
              dismiss();
            }
          }}
        />
        <div class={styles.actions}>
          <Button variant="secondary" onClick={dismiss}>
            {t('button.cancel')}
          </Button>
          <Button onClick={submit} disabled={value() === ''}>
            {t('button.ok')}
          </Button>
        </div>
      </Show>
    </div>
  );
};
