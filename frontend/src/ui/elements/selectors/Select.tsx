import { Show, type JSX } from 'solid-js';
import * as KSelect from '@kobalte/core/select';
import { keepPopupOpenOnInsideContent } from './dismissInsideGuard';
import { CheckIcon, ChevronDownIcon } from '../../icons';
import { usePortalMount } from '../../utils/portalMount';
import type { FocusTarget } from '../../utils/createFocusTarget';
import styles from './Select.module.css';

export interface SelectOption {
  value: string;
  label: string;
  /** Optional leading adornment (icon, or a coloured status dot). */
  adornment?: JSX.Element;
  /** Optional muted second line under the label. */
  description?: string;
  disabled?: boolean;
}

interface SelectProps {
  label: string;
  /**
   * Name the trigger via `aria-label` instead of rendering a visible label —
   * for dense contexts (a table cell, or an externally-labelled FieldRow)
   * where a column header or row label already names the control. The
   * accessible name is unchanged. Mirrors TextField/Combobox.
   */
  hideLabel?: boolean;
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  helperText?: string;
  disabled?: boolean;
  /**
   * Control size. 'default' is the form-field size; 'small' is a compact
   * variant for dense contexts like a toolbar or the pagination rows-per-page
   * control. Matches the shared input size scale (see --input-height*).
   */
  size?: 'default' | 'small';
  /**
   * Max-width cap (the container can always be narrower), mirroring
   * {@link TextField}: `compact` (10rem — the trigger box only, for a dense
   * row like a page-header toolbar; the selected value ellipsises if it
   * overruns), `short` (default) / `long` for form fields, `full` to fill the
   * available width — e.g. a detail row's value column so the dropdown aligns
   * with the text fields beside it.
   */
  width?: 'compact' | 'short' | 'long' | 'full';
  class?: string;
  /** `data-testid` for the trigger button (locale-stable test hook, e2e/TESTIDS.md). */
  testId?: string;
  /**
   * A `createFocusTarget()` handle bound to the trigger button — for an owner
   * that focuses this select after an action. The trigger is internal to the
   * Kobalte composition, so a plain `ref` can't reach it.
   */
  focusTarget?: FocusTarget;
}

/*
 * Styled drop-down — Kobalte Select (headless). Same job as a native <select>
 * (pick one from a fixed list) but for when the closed control and the options
 * need RICH content the native <option> can't render: a status colour-dot, an
 * icon, a two-line option. Hand-rolling that means re-implementing exactly what
 * WCAG 2.2 grades — a role="listbox" popup, typeahead, arrow / Home / End keys,
 * focus return, RTL-aware placement. Kobalte supplies that contract (the Solid
 * analogue of the RnD prototype's Radix Select — same reasoning, see its
 * UI_ELEMENTS.md); we own 100% of the markup + CSS, styled via Kobalte's
 * data-* state attributes.
 *
 * The public API mirrors the prototype's <Select>: string `value` in/out, with
 * the option objects resolved internally (Kobalte's own value model is the
 * option object).
 */
export const Select = (props: SelectProps) => {
  // Inside a Dialog, mount the listbox into the dialog element (top layer +
  // non-inert); outside one this is undefined and Kobalte's default <body>
  // portal is used.
  const portalMount = usePortalMount();
  let contentEl: HTMLElement | undefined;
  const findOption = (value: string | undefined) =>
    value === undefined
      ? undefined
      : (props.options.find(o => o.value === value) ?? null);

  return (
    <KSelect.Root<SelectOption>
      class={props.class ? `${styles.field} ${props.class}` : styles.field}
      data-size={props.size ?? 'default'}
      data-width={props.width ?? 'short'}
      options={props.options}
      optionValue="value"
      optionTextValue="label"
      optionDisabled="disabled"
      value={findOption(props.value)}
      defaultValue={findOption(props.defaultValue) ?? undefined}
      onChange={option => option && props.onValueChange?.(option.value)}
      placeholder={props.placeholder ?? 'Select…'}
      disabled={props.disabled}
      itemComponent={itemProps => (
        <KSelect.Item item={itemProps.item} class={styles.item}>
          <Show when={itemProps.item.rawValue.adornment}>
            <span class={styles.adornment}>
              {itemProps.item.rawValue.adornment}
            </span>
          </Show>
          <span class={styles.itemBody}>
            <KSelect.ItemLabel>
              {itemProps.item.rawValue.label}
            </KSelect.ItemLabel>
            <Show when={itemProps.item.rawValue.description}>
              <span class={styles.itemDescription}>
                {itemProps.item.rawValue.description}
              </span>
            </Show>
          </span>
          <KSelect.ItemIndicator class={styles.itemIndicator}>
            <CheckIcon />
          </KSelect.ItemIndicator>
        </KSelect.Item>
      )}
    >
      <Show when={!props.hideLabel}>
        <KSelect.Label class={styles.label}>{props.label}</KSelect.Label>
      </Show>
      <KSelect.Trigger
        // Always a real callback: Kobalte forwards `ref` into its own
        // polymorphic element props, where a bare `undefined` is not the same
        // as an absent ref.
        ref={(el: HTMLButtonElement) => props.focusTarget?.ref(el)}
        class={styles.trigger}
        data-testid={props.testId}
        aria-label={props.hideLabel ? props.label : undefined}
      >
        <KSelect.Value<SelectOption> class={styles.value}>
          {state => state.selectedOption().label}
        </KSelect.Value>
        <KSelect.Icon class={styles.triggerIcon}>
          <ChevronDownIcon />
        </KSelect.Icon>
      </KSelect.Trigger>
      <Show when={props.helperText}>
        <KSelect.Description class={styles.helper}>
          {props.helperText}
        </KSelect.Description>
      </Show>
      <KSelect.Portal mount={portalMount?.()}>
        <KSelect.Content
          ref={contentEl}
          class={styles.content}
          // Keep the listbox open only when a pointerdown lands inside this
          // popup's own content — Kobalte otherwise dismisses an option click
          // before it commits when the popup is mounted in a dialog (see
          // dismissInsideGuard). Any click outside the listbox — blank space,
          // another field — still closes it.
          onInteractOutside={keepPopupOpenOnInsideContent(() => contentEl)}
        >
          <KSelect.Listbox class={styles.listbox} />
        </KSelect.Content>
      </KSelect.Portal>
    </KSelect.Root>
  );
};
