import { children, createUniqueId, Show, type JSX } from 'solid-js';
import { SearchIcon } from '../../icons';
import type { FocusTarget } from '../../utils/createFocusTarget';
import styles from './PickerField.module.css';

export interface PickerFieldProps {
  label: string;
  /** Names the button via `aria-label` instead of rendering a visible label. */
  hideLabel?: boolean;
  /** The chosen value's text; the placeholder shows while there's none. */
  value?: string;
  placeholder?: string;
  size?: 'default' | 'small';
  required?: boolean;
  disabled?: boolean;
  /** Opens the owner's picking dialog. */
  onOpen: () => void;
  /**
   * A control at the field's end, outside the button (a pencil to edit what
   * was picked). It stays usable while the field is disabled; the owner
   * decides whether to render it.
   */
  endAction?: JSX.Element;
  /** `data-testid` for the button. */
  testId?: string;
  focusTarget?: FocusTarget;
}

/**
 * A field that picks its value in a dialog rather than a drop-down: a
 * field-shaped button showing the current value, which opens the owner's
 * dialog. For a choice too big for a list, which needs a search of its own
 * (a record's patient). It reads as a field, like a Select beside it, and
 * nothing is typed into it.
 */
export const PickerField = (props: PickerFieldProps): JSX.Element => {
  const labelId = createUniqueId();
  // Resolved once: the owner often passes its own <Show>, which may render
  // nothing, and then the wrapper shouldn't render either.
  const endAction = children(() => props.endAction);
  return (
    <div class={styles.field} data-size={props.size ?? 'default'}>
      <Show when={!props.hideLabel}>
        <span id={labelId} class={styles.label}>
          {props.label}
          <Show when={props.required}>
            <span class={styles.required} aria-hidden="true">
              *
            </span>
          </Show>
        </span>
      </Show>
      <div class={styles.box} data-disabled={props.disabled ? '' : undefined}>
        <button
          type="button"
          ref={el => props.focusTarget?.ref(el)}
          class={styles.trigger}
          disabled={props.disabled}
          aria-haspopup="dialog"
          aria-labelledby={props.hideLabel ? undefined : labelId}
          aria-label={props.hideLabel ? props.label : undefined}
          aria-required={props.required ? 'true' : undefined}
          data-testid={props.testId}
          onClick={() => props.onOpen()}
        >
          <SearchIcon class={styles.icon} aria-hidden="true" />
          <span
            class={styles.value}
            data-placeholder-shown={props.value ? undefined : ''}
          >
            {props.value || props.placeholder}
          </span>
        </button>
        <Show when={endAction.toArray().length > 0}>
          <span class={styles.endAction}>{endAction()}</span>
        </Show>
      </div>
    </div>
  );
};
