import { createSignal, For, Show, type JSX } from 'solid-js';
import * as DropdownMenu from '@kobalte/core/dropdown-menu';
import { ChevronDownIcon } from '../../icons';
import { createRipple } from '../../utils/createRipple';
import { Ripple } from './Ripple';
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
   * Disable the whole control — both the main action and the caret menu. Prefer
   * this (with `disabledTitle`) over hiding the button when the action is
   * temporarily unavailable ("disable with an explanation" — ui-surface
   * cross-cutting).
   */
  disabled?: boolean;
  /** Native tooltip shown while `disabled` — the reason the action is unavailable. */
  disabledTitle?: string;
  /**
   * Test-hook prefix (e2e/TESTIDS.md): stamps `<testId>-main` on the main
   * button, `<testId>-dropdown` on the caret, and `<testId>-option-<value>`
   * on each menu item (e.g. `status-change-button`, `export-csv`).
   */
  testId?: string;
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

  return (
    <div class={styles.split} data-variant={variant()}>
      <button
        type="button"
        class={styles.main}
        data-variant={variant()}
        data-testid={props.testId ? `${props.testId}-main` : undefined}
        disabled={props.disabled}
        title={props.disabled ? props.disabledTitle : undefined}
        onClick={() => {
          if (!props.disabled) props.onAction?.(selectedValue());
        }}
        onPointerDown={props.disabled ? undefined : mainRipple.onPointerDown}
      >
        <Show when={props.icon}>
          <span class={styles.icon}>{props.icon}</span>
        </Show>
        <span class={styles.label}>{selectedOption()?.label}</span>
        <Ripple ripples={mainRipple.ripples()} onDone={mainRipple.dismiss} />
      </button>

      <DropdownMenu.Root placement="bottom-end" gutter={4}>
        <DropdownMenu.Trigger
          class={styles.caret}
          data-variant={variant()}
          data-testid={props.testId ? `${props.testId}-dropdown` : undefined}
          aria-label={props.menuLabel ?? 'More options'}
          disabled={props.disabled}
          title={props.disabled ? props.disabledTitle : undefined}
          onPointerDown={props.disabled ? undefined : caretRipple.onPointerDown}
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
