import { createSignal, splitProps } from 'solid-js';
import { EyeIcon, EyeOffIcon } from '../../icons';
import { t } from '../../../intl';
import { TextField, type TextFieldProps } from './TextField';
import styles from './PasswordField.module.css';

export interface PasswordFieldProps extends Omit<
  TextFieldProps,
  'type' | 'endAction'
> {
  /**
   * `data-testid` for the `<input>` (spread through to TextField) — declared
   * here so the toggle's id can be derived from it. See `toggleTestId`.
   */
  'data-testid'?: string;
  /**
   * `data-testid` for the show/hide toggle button (locale-stable test hook,
   * e2e/TESTIDS.md). Defaults to `<data-testid>-visibility` when the field
   * itself has a `data-testid` (the shared e2e contract id, e.g.
   * `sync-settings-password-visibility`), so most call sites need only the one
   * id.
   */
  toggleTestId?: string;
}

/*
 * Password input — a thin variant of TextField. Masking is the standard
 * `type="password"` input; the only special piece is the show/hide toggle,
 * rendered in TextField's interactive `endAction` slot (the same end
 * icon-button affordance as Combobox's clear button). The toggle flips the
 * input's `type` between `password` and `text`; everything else — label, error
 * line, focus ring, aria wiring — comes from TextField unchanged.
 */
export const PasswordField = (props: PasswordFieldProps) => {
  const [local, rest] = splitProps(props, ['toggleTestId', 'disabled']);
  const [visible, setVisible] = createSignal(false);

  const toggleTestId = () => {
    if (local.toggleTestId) return local.toggleTestId;
    const fieldTestId = rest['data-testid'];
    return fieldTestId ? `${fieldTestId}-visibility` : undefined;
  };

  return (
    <TextField
      {...rest}
      type={visible() ? 'text' : 'password'}
      disabled={local.disabled}
      endAction={
        <button
          type="button"
          class={styles.toggle}
          data-testid={toggleTestId()}
          disabled={local.disabled}
          aria-label={t('label.toggle-password-visibility')}
          aria-pressed={visible()}
          onClick={() => setVisible(shown => !shown)}
        >
          {visible() ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      }
    />
  );
};
