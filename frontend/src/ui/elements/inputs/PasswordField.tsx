import { createSignal, splitProps, type JSX } from 'solid-js';
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
 * `type="password"` input; the special pieces are the show/hide toggle,
 * rendered in TextField's interactive `endAction` slot (the same end
 * icon-button affordance as Combobox's clear button), and the caps-lock
 * notice: keystrokes report the CapsLock modifier state, and while it's on
 * the field shows TextField's advisory warning line (`OMS-REG-LGN-01.31` —
 * displacing any warning the call site passed, until a keystroke with caps
 * off). The toggle flips the input's `type` between `password` and `text`;
 * everything else — label, error line, focus ring, aria wiring — comes from
 * TextField unchanged.
 */
export const PasswordField = (props: PasswordFieldProps) => {
  const [local, rest] = splitProps(props, [
    'toggleTestId',
    'disabled',
    'warning',
    'onKeyDown',
    'onKeyUp',
  ]);
  const [visible, setVisible] = createSignal(false);
  const [capsLock, setCapsLock] = createSignal(false);

  const toggleTestId = () => {
    if (local.toggleTestId) return local.toggleTestId;
    const fieldTestId = rest['data-testid'];
    return fieldTestId ? `${fieldTestId}-visibility` : undefined;
  };

  // Reads the modifier on BOTH key events, then forwards to the call site's
  // own handler (accessed lazily so a swapped-in handler isn't stale). Both
  // events because the CapsLock key itself is one-sided on some platforms —
  // macOS fires only keydown when it engages and only keyup when it
  // disengages — while ordinary typing keeps the state fresh via either.
  const watchCapsLock =
    (
      forward: () =>
        JSX.EventHandlerUnion<HTMLInputElement, KeyboardEvent> | undefined
    ): JSX.EventHandler<HTMLInputElement, KeyboardEvent> =>
    event => {
      setCapsLock(event.getModifierState('CapsLock'));
      const handler = forward();
      if (typeof handler === 'function') handler(event);
      else if (handler) handler[0](handler[1], event);
    };

  return (
    <TextField
      {...rest}
      type={visible() ? 'text' : 'password'}
      disabled={local.disabled}
      warning={capsLock() ? t('warning.caps-lock') : local.warning}
      onKeyDown={watchCapsLock(() => local.onKeyDown)}
      onKeyUp={watchCapsLock(() => local.onKeyUp)}
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
