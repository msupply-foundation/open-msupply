import { t } from '../../../intl';
import { CloseIcon } from '../../icons';
import styles from './ClearButton.module.css';

export interface ClearButtonProps {
  /** The field's own label: the button is named "Clear <label>". */
  fieldLabel: string;
  /** Empties the field. */
  onClear: () => void;
  /** Where focus goes after a clear: the button unmounts, dropping focus. */
  refocus?: () => void;
  /** `data-testid`, by convention `<fieldTestId>-clear` (e2e/TESTIDS.md). */
  testId?: string;
  /** Placement within the host's frame (e.g. an overlay over a slot). */
  class?: string;
}

/*
 * The ✕ that empties a field. Pressing it doesn't take focus, so an uncommitted
 * typed date isn't saved on blur just before the clear.
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
