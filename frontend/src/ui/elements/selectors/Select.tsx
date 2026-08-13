import { children, createMemo, Show, type JSX } from 'solid-js';
import * as KSelect from '@kobalte/core/select';
import { keepPopupOpenOnInsideContent } from './dismissInsideGuard';
import { t } from '../../../intl';
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
 * The empty-option-set case. Kobalte's Select REFUSES to open on an empty
 * collection — its `open()` early-returns on `options.length <= 0`, and unlike
 * Combobox (`allowsEmptyCollection`) there is no prop to opt out. So a status
 * row inside the popup can never render: the popup never mounts, and the
 * trigger silently does nothing, which reads as a broken control (#906).
 *
 * The fix has to satisfy that length check, so the empty state IS an option: a
 * single DISABLED sentinel. Kobalte lists disabled options but won't select
 * them (`optionDisabled` below → `aria-disabled`, skipped by the selection
 * manager and by typeahead), and `.item[data-disabled]` already greys them —
 * so the row arrives muted and unselectable, with a screen reader announcing
 * "No options, dimmed". The value is never handed to a caller (see onChange).
 *
 * There is no search here, so the copy is not search-shaped: nothing the user
 * could type would populate this list.
 */
const NO_OPTIONS_VALUE = '__no-options__';

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

  // What Kobalte sees: the caller's options, or the disabled sentinel when it
  // has none (see NO_OPTIONS_VALUE). Resolution of `value` still runs against
  // the CALLER's options via findOption, so the sentinel can never become the
  // selection or be read back as a label.
  const options = createMemo<SelectOption[]>(() =>
    props.options.length === 0
      ? [
          {
            value: NO_OPTIONS_VALUE,
            label: t('label.no-options'),
            disabled: true,
          },
        ]
      : props.options
  );

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
      options={options()}
      optionValue="value"
      optionTextValue="label"
      optionDisabled="disabled"
      value={findOption(props.value)}
      defaultValue={findOption(props.defaultValue) ?? undefined}
      // The sentinel is disabled, so Kobalte won't select it — the guard keeps
      // that internal value from ever reaching a caller regardless.
      onChange={option =>
        option &&
        option.value !== NO_OPTIONS_VALUE &&
        props.onValueChange?.(option.value)
      }
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
