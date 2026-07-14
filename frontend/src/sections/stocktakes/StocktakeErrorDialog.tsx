import { Show, type Component } from 'solid-js';
import { t, tPlural } from '../../intl';
import { Button } from '../../ui/elements/buttons/Button';
import { Dialog } from '../../ui/elements/feedback/Dialog';
import { AlertTriangleIcon, SearchIcon, XCircleIcon } from '../../ui/icons';

// Summarises a failed save / finalise: how many lines have errors, plus the server-mapped
// message. When the failure carries line ids (a snapshot/current-count mismatch, or per-line
// batch-save errors) it offers "Show error lines", which wipes the current filters and applies an
// errors-only filter so the user lands on exactly the offending rows. With no line ids (a
// stocktake-wide error — on hold / not editable) it shows only the message and a Close.

export interface StocktakeErrorInfo {
  message: string;
  /** Offending stocktake-line ids — empty for a stocktake-wide error (no line filter offered). */
  lineIds: string[];
}

export interface StocktakeErrorDialogProps {
  error: StocktakeErrorInfo | undefined;
  onClose: () => void;
  /** Apply the errors-only filter (wipes other filters) and close. Only used when lineIds exist. */
  onShowErrors: (lineIds: string[]) => void;
}

export const StocktakeErrorDialog: Component<StocktakeErrorDialogProps> = (props) => (
  <Dialog
    open={props.error != null}
    onClose={props.onClose}
    icon={<AlertTriangleIcon />}
    title={t('stocktake.errors.title')}
    description={
      <>
        <p>{props.error?.message}</p>
        <Show when={(props.error?.lineIds.length ?? 0) > 0}>
          <p>{tPlural('stocktake.errors.summary', props.error?.lineIds.length ?? 0)}</p>
        </Show>
      </>
    }
    actions={
      <>
        <Button variant="secondary" icon={<XCircleIcon />} onClick={props.onClose}>
          {t('common.cancel')}
        </Button>
        <Show when={(props.error?.lineIds.length ?? 0) > 0}>
          <Button
            variant="primary"
            icon={<SearchIcon />}
            onClick={() => props.onShowErrors(props.error?.lineIds ?? [])}
          >
            {t('stocktake.errors.show')}
          </Button>
        </Show>
      </>
    }
  />
);
