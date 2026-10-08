import { createSignal, Show, type Component } from 'solid-js';
import { t } from '@/intl';
import { Button } from '@/ui/elements/buttons/Button';
import { PrinterIcon } from '@/ui/icons';
import { SelectReportModal } from '@/domain/reports';

// The requisition detail Export/Print action (spec S2 › page actions → reports
// S4): the trigger button + the shared record-report selector (owned by the
// reports vertical), bound to the REQUISITION context and this requisition's
// id. Printing is a read, offered on every status — no editability gate
// (rules › printing). Only sub-context-less forms list.
export const ExportPrintRequisitionAction: Component<{
  requisitionId: string;
}> = props => {
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
        data-testid="export-or-print-button"
        onClick={() => setOpen(true)}
      >
        {t('button.export-or-print')}
      </Button>
      <Show when={open()}>
        <SelectReportModal
          context="REQUISITION"
          extraFilter={{ subContext: { equalAnyOrNull: [] } }}
          dataId={props.requisitionId}
          onClose={() => setOpen(false)}
        />
      </Show>
    </>
  );
};
