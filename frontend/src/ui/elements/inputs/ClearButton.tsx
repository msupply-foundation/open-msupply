import { t } from '../../../intl';
import { CloseIcon } from '../../icons';
import styles from './ClearButton.module.css';

export interface ClearButtonProps {
  /** The field's own label: the button is named "Clear <label>". */
  fieldLabel: string;
  /** Empties the field. */
  onClear: () => void;
  /**
   * Where focus goes once cleared. The button is shown only while the field
   * holds a value, so it removes itself, and focus left on it would fall to
   * <body> and restart a keyboard user's Tab from the top.
   */
  refocus?: () => void;
  /** `data-testid`, by convention `<fieldTestId>-clear` (e2e/TESTIDS.md). */
  testId?: string;
  /** Placement within the host's frame (e.g. an overlay over a slot). */
  class?: string;
}

/*
 * The ✕ inside an input that empties it (#2054). One look, name and focus
 * behaviour for every field that offers a clear, so they don't drift.
 *
 * Pressing it doesn't take focus: a date typed but not yet committed would
 * otherwise commit on the input's blur, a save sent just before the clear.
 */
export const ClearButton = (props: ClearButtonProps) => (
  <button
    type="button"
    class={props.class ? `${styles.clear} ${props.class}` : styles.clear}
    aria-label={t('label.clear-field', { label: props.fieldLabel })}
    data-testid={props.testId}
    onMouseDown={e => e.preventDefault()}
    onClick={() => {
      props.onClear();
      props.refocus?.();
    }}
  >
    <CloseIcon />
  </button>
);
