import { createSignal, Show, type Component } from 'solid-js';
import { t } from '@/intl';
import { Button } from '@/ui/elements/buttons/Button';
import { PrinterIcon } from '@/ui/icons';
import { SelectReportModal } from '@/domain/reports';

// The prescription-request Export/Print action (spec/prescription-requests/
// ui-surface.md S3 → spec/reports S4): the trigger, plus the reports vertical's
// shared "Select a form" dialog over the PRESCRIPTION_REQUEST report context —
// the request's OWN context, not dispensing's PRESCRIPTION, because the record
// the forms render against is a prescription_request and not an invoice (a
// dispensation form pointed at a request id would find nothing). Printing is a
// read, so it is offered at every status (AC-E1).

export interface ExportPrintActionProps {
  requestId: string;
  /**
   * Leading available action once Add item hides (past New) — then carries the
   * header region's single primary emphasis (ui-standards/controls.md).
   */
  leadingAction?: boolean;
}

export const ExportPrintAction: Component<ExportPrintActionProps> = props => {
  const [open, setOpen] = createSignal(false);
  return (
    <>
      <Button
        variant={props.leadingAction ? 'primary' : 'secondary'}
        icon={<PrinterIcon />}
        data-testid="export-or-print-button"
        onClick={() => setOpen(true)}
      >
        {t('button.export-or-print')}
      </Button>
      <Show when={open()}>
        <SelectReportModal
          context="PRESCRIPTION_REQUEST"
          dataId={props.requestId}
          onClose={() => setOpen(false)}
        />
      </Show>
    </>
  );
};
