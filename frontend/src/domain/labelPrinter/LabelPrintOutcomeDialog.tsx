import { Show, type Component } from 'solid-js';
import { t } from '../../intl';
import { Alert } from '../../ui/elements/feedback/Alert';
import { OkButton } from '../../ui/elements/buttons/StandardButtons';
import { Dialog } from '../../ui/elements/feedback/Dialog';
import { ErrorDetails } from '../../ui/elements/feedback/ErrorDetails';
import type { LabelPrintOutcome } from './printLabels';

// What a print attempt that did not print says, for every screen that prints
// labels (spec/settings/ui-surface.md § what a print attempt says). A screen
// owns only WHERE its report appears — on the control that started it — never
// what it says, so this is one dialog rather than one per vertical.

export interface PrintReport {
  /**
   * What the control that started the print reports in place, where it reports
   * anything: a print CAUGHT before any request was made is a configuration
   * notice, not an attempt the control should claim to have made.
   */
  flash?: 'done' | 'failed';
  /** The dialog, where the outcome needs one. */
  dialog?: {
    severity: 'warning' | 'error';
    message: string;
    /** Raw underlying text for the disclosure, where there is any. */
    detail?: string;
  };
}

/** What an outcome tells the user, in both places it can be told. */
export const printOutcomeReport = (outcome: LabelPrintOutcome): PrintReport => {
  switch (outcome.kind) {
    case 'printed':
      return { flash: 'done' };
    // The user is being sent to Settings, not told something broke — and
    // nothing was attempted, so the control claims nothing.
    case 'not-configured':
      return {
        dialog: {
          severity: 'warning',
          message: t('error.label-printer-not-configured'),
        },
      };
    // The service listed nothing attached by USB. Actionable on its own —
    // attach a printer — so it IS the message and carries no disclosure. An
    // unreachable service is `failed`, so this advice is never misapplied.
    case 'no-usb-printer':
      return {
        flash: 'failed',
        dialog: {
          severity: 'error',
          message: t('error.no-usb-printer-found'),
        },
      };
    // Something refused the print. The message is generic; what actually
    // happened is the endpoint's own text, behind the disclosure.
    case 'failed':
      return {
        flash: 'failed',
        dialog: {
          severity: 'error',
          message: t('error.printing-label'),
          detail: outcome.detail,
        },
      };
  }
};

export interface LabelPrintOutcomeDialogProps {
  /** The outcome to report; `printed` and `undefined` both render nothing. */
  outcome: LabelPrintOutcome | undefined;
  onClose: () => void;
}

export const LabelPrintOutcomeDialog: Component<
  LabelPrintOutcomeDialogProps
> = props => {
  const dialog = () =>
    props.outcome && printOutcomeReport(props.outcome).dialog;
  return (
    <Show when={dialog()}>
      {dialog => (
        <Dialog
          open
          onClose={props.onClose}
          testId="print-error-modal"
          title={t('heading.unable-to-print')}
          actions={
            <OkButton
              data-testid="print-error-modal-ok"
              onClick={props.onClose}
            />
          }
        >
          <Alert severity={dialog().severity}>
            {dialog().message}
            <Show when={dialog().detail}>
              {detail => <ErrorDetails detail={detail()} />}
            </Show>
          </Alert>
        </Dialog>
      )}
    </Show>
  );
};
