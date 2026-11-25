import {
  createEffect,
  createSignal,
  on,
  Show,
  splitProps,
  type Component,
} from 'solid-js';
import { t } from '@/intl';
import { Button } from '@/ui/elements/buttons/Button';
import { PrinterIcon } from '@/ui/icons';
import {
  SelectReportModal,
  type SelectReportModalProps,
} from './SelectReportModal';

export type ExportPrintButtonProps = Omit<SelectReportModalProps, 'onClose'> & {
  /**
   * Nothing to print yet (a screen whose record comes and goes, as the Simple
   * dispensing screen's does): the trigger is shown, disabled, with
   * `disabledReason` as its tooltip.
   */
  disabled?: boolean;
  disabledReason?: string;
};

// A record screen's Export/Print page action (spec/reports S4): the header
// trigger plus the shared "Select a form" dialog. A host names only the
// report context, the record and whatever the generation needs seeded.
export const ExportPrintButton: Component<ExportPrintButtonProps> = props => {
  const [open, setOpen] = createSignal(false);
  const [local, modalProps] = splitProps(props, ['disabled', 'disabledReason']);
  // Closed, not just hidden, when the screen loses its record or moves to
  // another while the dialog is open (browser Back or Forward on the Simple
  // dispensing screen): it never comes back by itself, and never prints a
  // record it wasn't opened for.
  createEffect(
    on(
      () => [local.disabled, props.dataId],
      () => setOpen(false),
      { defer: true }
    )
  );
  return (
    <>
      <Button
        variant="secondary"
        icon={<PrinterIcon />}
        collapsible="narrow"
        title={
          local.disabled && local.disabledReason
            ? local.disabledReason
            : t('button.export-or-print')
        }
        disabled={local.disabled}
        data-testid="export-or-print-button"
        onClick={() => setOpen(true)}
      >
        {t('button.export-or-print')}
      </Button>
      <Show when={open()}>
        <SelectReportModal {...modalProps} onClose={() => setOpen(false)} />
      </Show>
    </>
  );
};
