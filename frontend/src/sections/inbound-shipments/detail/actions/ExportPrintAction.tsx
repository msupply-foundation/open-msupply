import { createSignal, Show, type Component } from 'solid-js';
import { t } from '../../../../intl';
import { Button } from '../../../../ui/elements/buttons/Button';
import { PrinterIcon } from '../../../../ui/icons';
import { SelectReportModal, type ReportSort } from '../../../../domain/reports';

// The inbound-shipment detail Report/Print action (spec S3 → reports S4 /
// AC-L6): trigger button + the shared "Select a form" dialog (owned by the
// reports vertical). Mirrors the stocktake ExportPrintAction — this only names
// the trigger and passes the shipment id + the line table's current sort.
export interface ExportPrintActionProps {
  invoiceId: string;
  sort?: ReportSort;
}

export const ExportPrintAction: Component<ExportPrintActionProps> = props => {
  const [open, setOpen] = createSignal(false);
  return (
    <>
      <Button
        variant="secondary"
        icon={<PrinterIcon />}
        // Icon-only on a narrow viewport, so the header's action cluster fits
        // beside the breadcrumb instead of taking a row of its own.
        collapsible="narrow"
        title={t('button.export-or-print')}
        onClick={() => setOpen(true)}
      >
        {t('button.export-or-print')}
      </Button>
      <Show when={open()}>
        <SelectReportModal
          context="INBOUND_SHIPMENT"
          dataId={props.invoiceId}
          sort={props.sort}
          onClose={() => setOpen(false)}
        />
      </Show>
    </>
  );
};
