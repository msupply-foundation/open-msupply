import { createSignal, onCleanup, onMount, type Accessor } from 'solid-js';
import { useBeforeLeave } from '@solidjs/router';

/*
 * createConfirmOnLeave (kdd/domain-modules) — the "discard unsaved changes?"
 * guard for a detail view with a local edit buffer, lifted out of the patient
 * detail view for any such view to reuse. Like createDebouncedEdit, a reusable
 * primitive rather than an entity module: it couples to app concerns
 * (@solidjs/router), so it lives in domain/, not the pure ui/ library.
 *
 * It owns only the *behaviour* — the two mechanisms that are fiddly to get
 * right and identical everywhere:
 *
 *  1. Route guard. useBeforeLeave intercepts every route navigation while the
 *     form is dirty — footer/breadcrumb, a row that opens another screen, a
 *     nav link, the browser back/forward button (@solidjs/router routes those
 *     through beforeLeave on popstate), and a tab switch (a query-only change,
 *     but a leave to the user). The blocked navigation is stashed and, on
 *     confirm, replayed with force. onDiscard runs first, so a caller that
 *     stays mounted across the "leave" (a tab switch) can reset its buffer.
 *  2. Full-document exit. useBeforeLeave can't see a reload, tab/window close,
 *     or an external URL; a beforeunload handler raises the browser's own
 *     leave-site prompt for those (its text is fixed by the browser). This
 *     never double-prompts with the dialog: beforeunload fires only on a real
 *     document unload, which in-app navigation never causes.
 *
 * The *presentation* stays at the call site (kdd/explicit-composition): the
 * view renders its own ConfirmDialog, binding open/confirm/cancel — this
 * primitive deliberately renders nothing. The standard wiring is:
 *
 *   const leaveGuard = createConfirmOnLeave({ isDirty, onDiscard: resetDraft });
 *   // ...
 *   <ConfirmDialog
 *     open={leaveGuard.open()}
 *     title={t('heading.are-you-sure')}
 *     message={t('messages.discard-changes')}
 *     confirmLabel={t('button.discard')}
 *     onConfirm={leaveGuard.confirm}
 *     onClose={leaveGuard.cancel}
 *   />
 *
 * Must be called during component setup (it uses useBeforeLeave/onMount).
 */
export interface ConfirmOnLeaveOptions {
  /** True while the form has unsaved edits — a leave then raises the prompt. */
  isDirty: () => boolean;
  /**
   * Run when the user confirms the discard, before the blocked navigation is
   * replayed. Reset the edit buffer here so a "leave" that stays mounted (a tab
   * switch) is truly discarded; a view that unmounts on leave can omit it.
   */
  onDiscard?: () => void;
}

export interface ConfirmOnLeave {
  /** Whether the discard prompt should show. Bind to the dialog's `open`. */
  open: Accessor<boolean>;
  /** Confirm the discard: run `onDiscard`, then replay the blocked navigation. */
  confirm: () => void;
  /** Dismiss the prompt and stay put, keeping the edits. */
  cancel: () => void;
}

export const createConfirmOnLeave = (
  options: ConfirmOnLeaveOptions
): ConfirmOnLeave => {
  const [open, setOpen] = createSignal(false);
  const [pending, setPending] = createSignal<(() => void) | null>(null);

  useBeforeLeave(e => {
    if (!options.isDirty() || e.defaultPrevented) return;
    e.preventDefault();
    setPending(() => () => e.retry(true));
    setOpen(true);
  });

  onMount(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!options.isDirty()) return;
      e.preventDefault();
      e.returnValue = ''; // legacy browsers gate the prompt on returnValue
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    onCleanup(() => window.removeEventListener('beforeunload', onBeforeUnload));
  });

  const confirm = () => {
    setOpen(false);
    const go = pending();
    setPending(null);
    options.onDiscard?.();
    go?.();
  };

  const cancel = () => {
    setPending(null);
    setOpen(false);
  };

  return { open, confirm, cancel };
};
