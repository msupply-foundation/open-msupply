import {
  createComputed,
  createEffect,
  createSignal,
  onCleanup,
  Show,
} from 'solid-js';
import { Portal } from 'solid-js/web';
import { TextField } from '../ui/elements/inputs/TextField';
import { Button } from '../ui/elements/buttons/Button';
import { ScanIcon } from '../ui/icons';
import { t } from '../intl';
import { reLoginRequired } from '../auth/authContext';
import { stopListening } from './barcodeScanner';
import {
  cancelManualScan,
  manualPromptMode,
  manualPromptOpen,
  submitManualScan,
} from './barcodeSources/manual';
import styles from './ManualScanInput.module.css';

type PromptMode = ReturnType<typeof manualPromptMode>;

/** The open modal <dialog> on top, if any; later in the document wins. */
const topModalDialog = (): HTMLDialogElement | undefined =>
  [...document.querySelectorAll('dialog')]
    .filter(d => d.matches(':modal'))
    .at(-1);

// The typed stand-in for a scanner (spec/settings/rules.md § Devices —
// barcode scanner). Mounted ONCE, app-wide, in App.tsx: manual input can be
// triggered from any screen that scans, and the prompt belongs to the device
// rather than to whichever screen happens to be asking.
//
// Renders nothing unless the manual source has opened the prompt, so the
// mount costs one signal read on every other render.
export const ManualScanInput = () => {
  const [value, setValue] = createSignal('');
  const [panel, setPanel] = createSignal<HTMLDivElement>();
  const [host, setHost] = createSignal<HTMLElement>(document.body);
  const [expanded, setExpanded] = createSignal(true);
  let input: HTMLInputElement | undefined;
  let chip: HTMLButtonElement | undefined;
  // Where focus was before it came into the panel, to hand it back on
  // dismiss: the panel's controls vanish with it, and a removed element fires
  // no focusout, so nothing else (a line editor's own focus guard included)
  // would notice focus has dropped to <body>.
  let returnFocus: HTMLElement | undefined;

  // A modal <dialog> makes everything outside it inert, top layer or not, so
  // a prompt mounted in <body> is visible but untouchable while a line editor
  // is open (#2138) — the same reason popups mount inside the dialog
  // (ui/utils/portalMount.ts). The prompt isn't rendered from inside the
  // dialog, so it can't read that context: it follows the topmost open modal
  // instead, watching `open` while the prompt is up. A computation, not an
  // effect, so a prompt opened over an already-open dialog is mounted there
  // before the effect below focuses it.
  createComputed(() => {
    if (!manualPromptOpen()) return;
    const follow = () => setHost(topModalDialog() ?? document.body);
    follow();
    const observer = new MutationObserver(follow);
    observer.observe(document.documentElement, {
      subtree: true,
      attributeFilter: ['open'],
    });
    onCleanup(() => observer.disconnect());
  });

  // Each new ask starts from the full panel, not the chip a click elsewhere
  // left it as: the prompt opening, and a Scan once taking over the prompt
  // while it's already open to listen. A computation, so the input is
  // rendered again before the effect below focuses it.
  createComputed<PromptMode>(was => {
    const mode = manualPromptMode();
    if (mode !== was) setExpanded(true);
    return mode;
  });

  // The top layer is entered by showPopover(), not by CSS, so the open signal
  // has to drive it imperatively — and again for each new host, since moving
  // hosts mounts a fresh panel. Both calls throw if the element is already in
  // the requested state (a double-open, or a UA-dismissed panel we then ask
  // to hide), and neither case is worth failing on. Only a new ask takes
  // focus: a dialog opening under the prompt has just put focus where it
  // wants it.
  //
  // Hidden while the re-login modal is up: following the topmost modal would
  // otherwise put the prompt over it, and a scan typed there would reach the
  // screen behind before anyone has logged back in.
  createEffect<PromptMode>(was => {
    const open = manualPromptOpen() && !reLoginRequired();
    const ask = open ? manualPromptMode() : undefined;
    const el = panel();
    if (!el) return was;
    try {
      if (open) el.showPopover();
      else el.hidePopover();
    } catch {
      /* already in that state */
    }
    if (ask && ask !== was) {
      setValue('');
      input?.focus();
    }
    // The next opening starts expanded, with the input already rendered for
    // the focus above — after re-login too, when the ask itself is unchanged.
    if (!open) setExpanded(true);
    return ask;
  }, undefined);

  // Not in use = the user has clicked somewhere else. Drawn over a line
  // editor, the full panel covers the editor's corner (its notices among it),
  // so it shrinks to a chip there until asked for again. A pointer, not
  // focus: focus also moves without the user leaving the panel — a dialog
  // opening under it focuses its own first field, and a screenshot tool takes
  // the window's focus — and neither should fold it away. Not while hidden
  // for re-login either, or logging back in would bring back the chip.
  createEffect(() => {
    const el = panel();
    if (!el || !expanded() || !manualPromptOpen() || reLoginRequired()) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Node) || !el.contains(event.target))
        setExpanded(false);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    onCleanup(() =>
      document.removeEventListener('pointerdown', onPointerDown, true)
    );
  });

  const expand = () => {
    setExpanded(true);
    input?.focus();
  };

  const submit = () => {
    const raw = value();
    if (raw === '') return;
    submitManualScan(raw);
    // While armed the source keeps listening, but the panel folds to its chip:
    // the scan has just raised something on screen (an editor, a notice in
    // one) that the full panel would sit over. Focus goes to the chip, so the
    // next scan is Enter away from the keyboard — unless the scan opened a
    // dialog, which has taken focus already. A one-shot is done after one
    // scan and has closed the prompt, so focus goes back as on dismiss.
    setValue('');
    if (!manualPromptOpen()) return restoreFocus();
    setExpanded(false);
    chip?.focus();
  };

  const restoreFocus = () => {
    if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
    returnFocus = undefined;
  };

  const dismiss = () => {
    // A one-shot has a promise waiting on it, which only the source can
    // settle; an armed source is the wrapper's to release, because ownership
    // of the scan lives there. Direct calls to each rather than one
    // do-the-right-thing helper, so both paths stay traceable.
    if (manualPromptMode() === 'listening') void stopListening();
    else cancelManualScan();
    restoreFocus();
  };

  // Keyed, so a new host mounts a new panel; the typed value lives above it
  // and carries over. The Portal's own wrapper div gets no box, or it would
  // become a flex item (and another gap) at the foot of the dialog.
  return (
    <Show when={host()} keyed>
      {mount => (
        <Portal mount={mount} ref={el => el.classList.add(styles.host)}>
          <div
            ref={setPanel}
            popover="manual"
            class={styles.panel}
            data-collapsed={expanded() ? undefined : ''}
            onFocusIn={e => {
              const from = e.relatedTarget;
              if (
                from instanceof HTMLElement &&
                !e.currentTarget.contains(from)
              )
                returnFocus = from;
            }}
          >
            <Show when={manualPromptOpen()}>
              <Show
                when={expanded()}
                fallback={
                  <Button
                    ref={chip}
                    variant="secondary"
                    size="small"
                    icon={<ScanIcon />}
                    aria-expanded="false"
                    data-testid="manual-scan-expand"
                    onClick={expand}
                  >
                    {t('label.barcode')}
                  </Button>
                }
              >
                <p class={styles.heading}>{t('settings.barcode-scanner')}</p>
                <TextField
                  ref={input}
                  label={t('label.enter-barcode')}
                  value={value()}
                  autofocus
                  data-testid="manual-scan-input"
                  onInput={e => setValue(e.currentTarget.value)}
                  onKeyDown={e => {
                    // Both are claimed here, so inside a line editor neither
                    // reaches the dialog: Enter would confirm it, Escape close
                    // it. preventDefault is what Dialog checks for Enter.
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      submit();
                    }
                    // Escape would otherwise be swallowed by the panel;
                    // dismissing has to settle a pending one-shot, not just
                    // hide the element.
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
            </Show>
          </div>
        </Portal>
      )}
    </Show>
  );
};
