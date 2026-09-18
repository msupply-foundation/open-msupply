import { ariaKeyshortcuts } from '../ui/utils/shortcuts';
import { declaredBindings } from '../ui/utils/keyActions';

/*
 * DEV ONLY — the KB-R2 defect, checked from the control's end.
 *
 * `Page` asserts one direction: a screen that renders a more-info panel and
 * registers no `Alt+M` has quietly stopped answering a binding the user learned
 * next door. This is the converse, and it generalises to every binding: a
 * control that ADVERTISES a key nothing answers. The badge and
 * `aria-keyshortcuts` are promises — to the user, and to assistive technology —
 * so a control showing "Option+N" that does nothing is worse than a control
 * showing nothing (AC-KB15; the same argument `Button` already applies to a
 * binding derived from a dialog-footer claim: "advertised only where it is
 * claimed").
 *
 * WHY A SWEEP RATHER THAN A CHECK INSIDE Button / IconButton / SplitButton.
 * The per-carrier version was built first and measured +632 B gzip in the
 * PRODUCTION bundle, despite the call sites being
 * `import.meta.env.DEV`-guarded and the message strings verifiably stripped.
 * The cost was not the check: it was the new module edge. `Button` is in
 * almost every chunk's graph, so importing `keyActions` from it pulled the
 * registry and its `shortcuts` dependency into that graph and reshaped
 * shared-chunk hoisting app-wide — the same effect `src/ui/CLAUDE.md`
 * principle 11 measured for barrels. Reading the DOM from one place instead
 * costs the carriers nothing, and this module is reached only through a
 * dynamic import inside a DEV branch, so production drops it whole: it is not
 * in the chunk graph at all.
 *
 * Two further gains from doing it in the DOM: it catches any carrier,
 * including a future component or a hand-written element, and it names the
 * control the way a developer will search for it (its test id).
 *
 * The trade is that it cannot see a control the audit never observes — the
 * showcase mounts no KeyboardHost, so its badge demo is not covered. That page
 * declares real actions for its carriers instead, which is the honest fix there
 * anyway.
 */

// One report per (control, binding). A screen renders two or three carriers for
// one action, and one line per defect is the useful volume.
const reported = new Set<string>();

/** How a developer will look for the offending control. */
const describe = (el: Element): string =>
  el.getAttribute('data-testid') ??
  el.getAttribute('aria-label') ??
  el.textContent?.trim().slice(0, 40) ??
  '(unlabelled control)';

const audit = (): void => {
  // The ARIA grammar, which is exactly what the carriers stamp on themselves
  // from their `Shortcut` — so comparing strings here compares the same value
  // the badge renders, with no second parser to drift.
  const declared = new Set(declaredBindings().map(ariaKeyshortcuts));
  for (const el of document.querySelectorAll('[aria-keyshortcuts]')) {
    const keys = el.getAttribute('aria-keyshortcuts');
    if (!keys || declared.has(keys)) continue;
    // A control inside a closed-but-mounted <dialog> is not rendered and makes
    // no promise to anyone; its dialog's own actions are
    // registered-but-disabled while closed, which `declaredBindings`
    // deliberately counts, so this only matters for a carrier whose surface is
    // closed AND whose binding is genuinely unowned.
    if (el.closest('dialog:not([open])')) continue;
    const key = `${describe(el)}::${keys}`;
    if (reported.has(key)) continue;
    reported.add(key);
    console.warn(
      `Shortcut advertised but unanswered: "${describe(el)}" declares ${keys}, and no registered action owns that binding — the badge and aria-keyshortcuts promise a key that does nothing (spec/keyboard KB-R2, AC-KB15). The SCREEN declares the action (createAddAction for Alt+N, createSidePanelOpen for Alt+M); the control carries only the shortcut.`
    );
  }
};

/**
 * Start auditing carriers. Returns the stop function.
 *
 * Debounced, and driven by a `MutationObserver` rather than a per-screen hook,
 * so it needs no cooperation from the screens it checks — arriving on a screen,
 * opening a dialog and flipping a `<Show>` all trigger it. The registry is
 * populated from component bodies, which run before their JSX mounts, so by the
 * time a mutation lands the action is already there.
 */
export const startCarrierAudit = (): (() => void) => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const schedule = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(audit, 250);
  };

  const observer = new MutationObserver(schedule);
  observer.observe(document.body, {
    subtree: true,
    childList: true,
    attributeFilter: ['aria-keyshortcuts'],
  });
  schedule();

  return () => {
    observer.disconnect();
    if (timer !== undefined) clearTimeout(timer);
  };
};
