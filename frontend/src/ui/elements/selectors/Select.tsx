import { Show, type JSX } from 'solid-js'
import * as KSelect from '@kobalte/core/select'
import { keepDialogOpenOnInside } from './dismissInsideGuard'
import { CheckIcon, ChevronDownIcon } from '../../icons'
import { usePortalMount } from '../../utils/portalMount'
import styles from './Select.module.css'

export interface SelectOption {
  value: string
  label: string
  /** Optional leading adornment (icon, or a coloured status dot). */
  adornment?: JSX.Element
  /** Optional muted second line under the label. */
  description?: string
  disabled?: boolean
}

interface SelectProps {
  label: string
  options: SelectOption[]
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  helperText?: string
  disabled?: boolean
  /** Control size. 'md' (default) is the form-field size; 'sm' is a compact variant
   *  for dense contexts like a toolbar or the pagination rows-per-page control. */
  size?: 'md' | 'sm'
  class?: string
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
  // Inside a Dialog, mount the listbox into the dialog element (top layer + non-inert);
  // outside one this is undefined and Kobalte's default <body> portal is used.
  const portalMount = usePortalMount()
  const findOption = (value: string | undefined) =>
    value === undefined
      ? undefined
      : (props.options.find(o => o.value === value) ?? null)

  return (
    <KSelect.Root<SelectOption>
      class={props.class ? `${styles.field} ${props.class}` : styles.field}
      data-size={props.size ?? 'md'}
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
      <KSelect.Label class={styles.label}>{props.label}</KSelect.Label>
      <KSelect.Trigger class={styles.trigger}>
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
          class={styles.content}
          // Keep the listbox open when a pointerdown lands inside the dialog it's mounted in
          // — Kobalte otherwise dismisses it before a mouse click commits (see
          // dismissInsideGuard). A genuine click outside the dialog still closes it.
          onInteractOutside={keepDialogOpenOnInside(portalMount?.())}
        >
          <KSelect.Listbox class={styles.listbox} />
        </KSelect.Content>
      </KSelect.Portal>
    </KSelect.Root>
  )
}
