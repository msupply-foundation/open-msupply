import { createSignal, Show, type Component } from 'solid-js';
import { t } from '../../../../intl';
import { Button } from '../../../../ui/elements/buttons/Button';
import { PrinterIcon } from '../../../../ui/icons';
import { SelectReportModal } from '../../../../domain/reports';

// The outbound-shipment detail Export/Print action (spec S3 → reports S4,
// AC-E1–E3): the header trigger button + the shared "Select a form" dialog
// (owned by the reports vertical). Peer of the other detail actions
// (self-contained button + modal, kdd/action-modal) and a static mirror of the
// inbound / customer-return / stocktake ExportPrintAction. The selector is
// imported STATICALLY (it is already a shared chunk across those verticals), so
// the dialog opens instantly with its own loading spinner — a lazy import here
// added an extra chunk-load beat on first open (the reported flicker) for no
// bundle saving, since the chunk ships regardless. Available at every status;
// this only names the trigger and passes the shipment id.
export interface ExportPrintActionProps {
  shipmentId: string;
}

export const ExportPrintAction: Component<ExportPrintActionProps> = props => {
  const [open, setOpen] = createSignal(false);
  return (
    <>
      <Button
        variant="secondary"
        icon={<PrinterIcon />}
        data-testid="export-print-button"
        onClick={() => setOpen(true)}
      >
        {t('button.export-or-print')}
      </Button>
      <Show when={open()}>
        <SelectReportModal
          context="OUTBOUND_SHIPMENT"
          dataId={props.shipmentId}
          onClose={() => setOpen(false)}
        />
      </Show>
    </>
  );
};
