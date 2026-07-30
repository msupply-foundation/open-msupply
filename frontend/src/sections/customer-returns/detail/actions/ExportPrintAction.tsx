import { createSignal, Show, type Component } from 'solid-js';
import { t } from '../../../../intl';
import { Button } from '../../../../ui/elements/buttons/Button';
import { PrinterIcon } from '../../../../ui/icons';
import { SelectReportModal } from '../../../../domain/reports';

// The customer-return detail-view Export/Print action (spec/customer-returns S3
// → spec/reports S4): the header trigger button, plus the shared "Select a
// form" dialog (owned by the reports vertical). Peer of the other detail
// actions (self-contained button + modal, kdd/action-modal) — matching the
// stocktake detail's ExportPrintAction shape and tone (secondary button, lazily
// mounted dialog). The reports vertical owns generation/printing; this only
// names the trigger and passes the return id. Available at every status.

export interface ExportPrintActionProps {
  /** The return the reports render against. */
  returnId: string;
}

export const ExportPrintAction: Component<ExportPrintActionProps> = props => {
  const [open, setOpen] = createSignal(false);
  return (
    <>
      <Button
        variant="secondary"
        icon={<PrinterIcon />}
        data-testid="export-or-print-button"
        onClick={() => setOpen(true)}
      >
        {t('button.export-or-print')}
      </Button>
      <Show when={open()}>
        <SelectReportModal
          context="CUSTOMER_RETURN"
          dataId={props.returnId}
          onClose={() => setOpen(false)}
        />
      </Show>
    </>
  );
};
