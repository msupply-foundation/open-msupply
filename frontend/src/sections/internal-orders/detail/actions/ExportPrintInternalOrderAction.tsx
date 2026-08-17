import { createSignal, Show, type Component } from 'solid-js';
import { t } from '../../../../intl';
import { Button } from '../../../../ui/elements/buttons/Button';
import { PrinterIcon } from '../../../../ui/icons';
import { SelectReportModal } from '../../../../domain/reports';

// The internal-order detail Export/Print action (spec S3 → reports S4,
// AC-PR1–PR3): the trigger button + the shared record-report selector (owned by
// the reports vertical), bound to the INTERNAL_ORDER context and this order's
// id. Printing is a read, offered on every status — no editability gate
// (AC-PR1). Only sub-context-less forms list — a program R&R form has its own
// surface and never appears in this generic selector (AC-PR2, contract ›
// printing). The line table's display sort never reaches generation, so no sort
// is passed (contract › printing). On an indicator program order the host
// seeds the program / period / customer identity so indicator report templates
// can locate the program data (AC-PR4); undefined on any other order.
export const ExportPrintInternalOrderAction: Component<{
  orderId: string;
  seedArgs?: Record<string, unknown>;
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
          context="INTERNAL_ORDER"
          extraFilter={{ subContext: { equalAnyOrNull: [] } }}
          dataId={props.orderId}
          seedArgs={props.seedArgs}
          onClose={() => setOpen(false)}
        />
      </Show>
    </>
  );
};
