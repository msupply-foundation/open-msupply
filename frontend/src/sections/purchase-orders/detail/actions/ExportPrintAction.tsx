import { createSignal, Show, type Component } from 'solid-js';
import { t } from '@/intl';
import { Button } from '@/ui/elements/buttons/Button';
import { PrinterIcon } from '@/ui/icons';
import { SelectReportModal, type ReportSort } from '@/domain/reports';

// The order's Export/Print page action (spec/purchase-orders S17 →
// spec/reports S4): the header trigger, plus the shared "Select a form" dialog
// the reports vertical owns. This names the trigger, the report CONTEXT and
// the order it acts on; what a report contains is reports' (README § three
// things this vertical names but does not own).

export interface ExportPrintActionProps {
  /** The order the reports render against. */
  orderId: string;
  /** The line table's current sort, so the document orders rows as shown. */
  sort?: ReportSort;
}

export const ExportPrintAction: Component<ExportPrintActionProps> = props => {
  const [open, setOpen] = createSignal(false);
  return (
    <>
      <Button
        variant="secondary"
        icon={<PrinterIcon />}
        collapsible="narrow"
        onClick={() => setOpen(true)}
      >
        {t('button.export-or-print')}
      </Button>
      <Show when={open()}>
        <SelectReportModal
          context="PURCHASE_ORDER"
          dataId={props.orderId}
          sort={props.sort}
          onClose={() => setOpen(false)}
        />
      </Show>
    </>
  );
};
