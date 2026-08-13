import { children, Show, type JSX } from 'solid-js';
import * as KSelect from '@kobalte/core/select';
import { keepPopupOpenOnInsideContent } from './dismissInsideGuard';
import { CheckIcon, ChevronDownIcon, CloseIcon } from '../../icons';
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
  /**
   * An affordance rendered inline after the label text — the InfoTooltip help
   * icon whose bubble explains the field. Kept outside the label element so it
   * isn't part of the control's accessible name. Ignored under `hideLabel`.
   * As TextField.
   */
  labelInfo?: JSX.Element;
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /**
   * Offer a clear (✕) affordance beside the chevron while a value is
   * selected — for an OPTIONAL pick the user must be able to empty again (a
   * report filter's enum argument). Clearing calls `onClear`; the owner
   * empties its bound state. Requires controlled usage (`value`): under
   * `clearable` an absent `value` reads as "no selection" rather than
   * uncontrolled. Default false — most selects are a must-have pick (a
   * direction, a rows-per-page count) where emptiness is meaningless.
   */
  clearable?: boolean;
  /** Called when the clear affordance is activated (see `clearable`). */
  onClear?: () => void;
  placeholder?: string;
  helperText?: string;
  disabled?: boolean;
  /**
   * Marks the field required: an asterisk on the label (TextField's marker, so
   * a select and a text field read alike) plus `aria-required` on the trigger.
   * Indication only — the gating stays with the form's own confirm rule.
   */
  required?: boolean;
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
  /**
   * `data-testid` for the trigger button (locale-stable test hook,
   * e2e/TESTIDS.md).
   */
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
  // Under `clearable`, an absent value is a real controlled state — Kobalte's
  // null ("no selection"). Left undefined, Kobalte flips to uncontrolled and a
  // cleared pick would keep rendering from its internal state.
  const controlledValue = () =>
    props.clearable
      ? (findOption(props.value) ?? null)
      : findOption(props.value);
  const showClear = () => Boolean(props.clearable) && !!findOption(props.value);

  // The label element itself (text + required asterisk). A local component so
  // it renders fresh in either branch (bare, or beside labelInfo) — reusing
  // one JSX node across both would try to mount it in two places. As
  // TextField.
  // Resolved once — a JSX prop read twice builds two element trees
  // (kdd/solid-reactivity-pitfalls §3).
  const labelInfo = children(() => props.labelInfo);
  const Label = () => (
    <KSelect.Label class={styles.label}>
      {props.label}
      <Show when={props.required}>
        <span class={styles.required} aria-hidden="true">
          *
        </span>
      </Show>
    </KSelect.Label>
  );

  return (
    <KSelect.Root<SelectOption>
      class={props.class ? `${styles.field} ${props.class}` : styles.field}
      data-size={props.size ?? 'default'}
      data-width={props.width ?? 'short'}
      options={props.options}
      optionValue="value"
      optionTextValue="label"
      optionDisabled="disabled"
      value={controlledValue()}
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
        <Show when={labelInfo()} fallback={<Label />}>
          {/* labelInfo sits OUTSIDE the label element, as a sibling: nested in
              it its accessible name would leak into the control's (the
              name-from-label computation concatenates descendant controls). */}
          <span class={styles.labelRow}>
            <Label />
            {labelInfo()}
          </span>
        </Show>
      </Show>
      {/* The clear affordance keeps its OWN slot beside the chevron (as
          Combobox — never swap it onto the pixel the benign chevron occupied).
          The trigger is a real <button>, so the ✕ can't nest inside it: a
          spacer reserves the slot in the trigger's flex row and the button
          overlays it from this wrapper. */}
      <div class={styles.control}>
        <KSelect.Trigger
          // Always a real callback: Kobalte forwards `ref` into its own
          // polymorphic element props, where a bare `undefined` is not the same
          // as an absent ref.
          ref={(el: HTMLButtonElement) => props.focusTarget?.ref(el)}
          class={styles.trigger}
          data-testid={props.testId}
          aria-label={props.hideLabel ? props.label : undefined}
          aria-required={props.required ? 'true' : undefined}
        >
          <KSelect.Value<SelectOption> class={styles.value}>
            {state => state.selectedOption().label}
          </KSelect.Value>
          <Show when={showClear()}>
            <span class={styles.clearSlot} aria-hidden="true" />
          </Show>
          <KSelect.Icon class={styles.triggerIcon}>
            <ChevronDownIcon />
          </KSelect.Icon>
        </KSelect.Trigger>
        <Show when={showClear()}>
          <button
            type="button"
            class={styles.clear}
            disabled={props.disabled}
            aria-label="Clear selection"
            onClick={() => props.onClear?.()}
          >
            <CloseIcon />
          </button>
        </Show>
      </div>
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
