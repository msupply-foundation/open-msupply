import { children, createSignal, For, Show, type JSX } from 'solid-js';
import * as DropdownMenu from '@kobalte/core/dropdown-menu';
import { ChevronDownIcon } from '../../icons';
import { createRipple } from '../../utils/createRipple';
import { Ripple } from './Ripple';
import { ShortcutBadge } from '../keyboard/ShortcutBadge';
import { ariaKeyshortcuts, type Shortcut } from '../../utils/shortcuts';
import styles from './SplitButton.module.css';

export interface SplitButtonOption {
  value: string;
  label: string;
  /**
   * A non-selectable entry (shown greyed, can't be picked) — e.g. a
   * past/current status in a
   *  status-change menu that lists every status for context. */
  disabled?: boolean;
  /**
   * Explanation shown as a native tooltip when the entry is disabled — the
   * "disable with reason" convention (prefer disabling with an explanation over
   * hiding an unavailable option; ui-surface cross-cutting).
   */
  title?: string;
}

interface SplitButtonProps {
  /** Leading icon for the main action. */
  icon?: JSX.Element;
  /**
   * Tone (ui-standards #btn-split): 'primary' (filled action blue, default) for
   * a dominant action, or 'secondary' (outlined) for a supporting toolbar split
   * (e.g. Export). Ghost/danger don't apply to split buttons.
   */
  variant?: 'primary' | 'secondary';
  options: SplitButtonOption[];
  /**
   * Controlled selected value; omit for uncontrolled (defaults to first
   * option).
   */
  value?: string;
  defaultValue?: string;
  /** Fired when the selection changes via the menu. */
  onValueChange?: (value: string) => void;
  /**
   * Fired when the main action runs — either the main (left) button is clicked,
   * or a menu item is picked (which selects AND acts, like the app's
   * SplitButton/ExportSelector).
   */
  onAction?: (value: string) => void;
  /**
   * Menu picks SELECT ONLY (update the main button's action) instead of also
   * running it — the status-change convention: pick "Shipped" from the menu,
   * then the main "Confirm Shipped" click acts. Default false (pick acts,
   * like the export selector).
   */
  menuSelectsOnly?: boolean;
  /** Accessible name for the caret trigger (it has no visible text). */
  menuLabel?: string;
  /**
   * Busy state: swaps the main button's icon for a spinner and makes the WHOLE
   * control inert (both halves disabled, `aria-busy` on the main button), so an
   * in-flight action can't re-fire from either half. The `<Button>` `loading`
   * contract, applied to the pair.
   */
  loading?: boolean;
  /**
   * Overrides the main button's visible label WITHOUT touching the menu (whose
   * entries keep their own labels, so the selection stays readable). For the
   * in-place outcome report — the main button briefly reads "Exported" /
   * "Export failed", then reverts (ui-standards/controls.md § action feedback,
   * never a toast). Paired with an `icon` swap by the caller.
   */
  mainLabel?: string;
  /**
   * Disable the whole control — both the main action and the caret menu. Prefer
   * this (with `disabledTitle`) over hiding the button when the action is
   * temporarily unavailable ("disable with an explanation" — ui-surface
   * cross-cutting).
   */
  disabled?: boolean;
  /**
   * Native tooltip shown while `disabled` — the reason the action is
   * unavailable.
   */
  disabledTitle?: string;
  /**
   * Test-hook prefix (e2e/TESTIDS.md): stamps `<testId>-main` on the main
   * button, `<testId>-dropdown` on the caret, and `<testId>-option-<value>`
   * on each menu item (e.g. `status-change-button`, `export-csv`).
   */
  testId?: string;
  /**
   * The key binding this control answers (spec/keyboard KB-H1, S2) — the same
   * one prop `Button` takes, driving both `aria-keyshortcuts` and the hint badge
   * so the two cannot drift (AC-KB15).
   *
   * It lands on the MAIN half, which is what the binding runs: the prescription
   * detail's `Alt+L` prints labels (the main action) and `Alt+V` confirms the
   * selected status, neither of which opens the caret menu. As with `Button`,
   * this control does not dispatch the key — the screen registers the action.
   */
  shortcut?: Shortcut;
}

/*
 * Split button — a primary action glued to a dropdown caret (Solid port of the
 * RnD prototype's ExportButton). There's no "split button" primitive: we
 * compose a plain <button> (runs the selected action) with a Kobalte
 * DropdownMenu (caret → choose an option). Mirrors the app's
 * SplitButton/ExportSelector: picking an option selects it AND runs the action.
 *
 * Each half gets its OWN ripple (inside the button, above its fill) — a single
 * ripple at the .split level would sit behind the halves and be hidden by their
 * opaque hover fill. The menu is portaled to <body>, so it inherits `dir` from
 * <html> and mirrors in RTL.
 */
export const SplitButton = (props: SplitButtonProps) => {
  const [internal, setInternal] = createSignal(
    props.defaultValue ?? props.options[0]?.value
  );
  const selectedValue = () => props.value ?? internal();
  const selectedOption = () =>
    props.options.find(o => o.value === selectedValue()) ?? props.options[0];

  const mainRipple = createRipple();
  const caretRipple = createRipple();

  const pick = (value: string) => {
    setInternal(value);
    props.onValueChange?.(value);
    if (!props.menuSelectsOnly) props.onAction?.(value);
  };

  const variant = () => props.variant ?? 'primary';
  // Busy is inertness on top of any caller-set disabled — one accessor so both
  // halves and the ripples agree.
  const inert = () => props.disabled === true || props.loading === true;
  // JSX-element props are lazy getters, and `icon` is read twice below (the
  // <Show> test + the insertion) — raw reads would create the passed element
  // twice per evaluation. Resolve once, as <Button> does
  // (kdd/solid-reactivity-pitfalls §3).
  const icon = children(() => props.icon);

  return (
    <div class={styles.split} data-variant={variant()}>
      {/* aria-live so a label swap is announced — the outcome flash, and the
          selection change on a menu pick. Always present: a live region has to
          exist BEFORE the text changes for the change to be announced. */}
      <button
        type="button"
        class={styles.main}
        data-variant={variant()}
        data-testid={props.testId ? `${props.testId}-main` : undefined}
        disabled={inert()}
        aria-busy={props.loading || undefined}
        aria-live="polite"
        // The ARIA grammar, not the platform spelling — the badge below renders
        // the human form from the same value (KB-M1, AC-KB15).
        aria-keyshortcuts={
          props.shortcut ? ariaKeyshortcuts(props.shortcut) : undefined
        }
        title={props.disabled ? props.disabledTitle : undefined}
        onClick={() => {
          if (!inert()) props.onAction?.(selectedValue());
        }}
        onPointerDown={event => {
          // Guarded INSIDE the handler: event props aren't reactive, so a
          // handler chosen at JSX time would go stale when `loading` flips.
          if (!inert()) mainRipple.onPointerDown(event);
        }}
      >
        {/* Spinner replaces the icon while loading (the <Button> contract). */}
        <Show
          when={props.loading}
          fallback={
            <Show when={icon()}>
              <span class={styles.icon}>{icon()}</span>
            </Show>
          }
        >
          <span class={styles.spinner} aria-hidden="true" />
        </Show>
        <span class={styles.label}>
          {props.mainLabel ?? selectedOption()?.label}
        </span>
        {/* The badge positions itself against this half, which is already
            `position: relative` (and `overflow: hidden`) for its ripple — the
            same positioning contract Button provides. */}
        <Show when={props.shortcut}>
          {shortcut => <ShortcutBadge shortcut={shortcut()} />}
        </Show>
        <Ripple ripples={mainRipple.ripples()} onDone={mainRipple.dismiss} />
      </button>

      <DropdownMenu.Root placement="bottom-end" gutter={4}>
        <DropdownMenu.Trigger
          class={styles.caret}
          data-variant={variant()}
          data-testid={props.testId ? `${props.testId}-dropdown` : undefined}
          aria-label={props.menuLabel ?? 'More options'}
          disabled={inert()}
          title={props.disabled ? props.disabledTitle : undefined}
          onPointerDown={event => {
            if (!inert()) caretRipple.onPointerDown(event);
          }}
        >
          <ChevronDownIcon class={styles.caretIcon} />
          <Ripple
            ripples={caretRipple.ripples()}
            onDone={caretRipple.dismiss}
          />
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content class={styles.content}>
            <For each={props.options}>
              {option => (
                <DropdownMenu.Item
                  class={styles.item}
                  data-testid={
                    props.testId
                      ? `${props.testId}-option-${option.value}`
                      : undefined
                  }
                  data-current={
                    option.value === selectedValue() ? 'true' : undefined
                  }
                  disabled={option.disabled}
                  title={option.disabled ? option.title : undefined}
                  onSelect={() => {
                    if (!option.disabled) pick(option.value);
                  }}
                >
                  {option.label}
                </DropdownMenu.Item>
              )}
            </For>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
};
