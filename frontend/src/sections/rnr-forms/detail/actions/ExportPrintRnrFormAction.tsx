import { createSignal, Show, type Component } from 'solid-js';
import { t } from '@/intl';
import { Button } from '@/ui/elements/buttons/Button';
import { PrinterIcon } from '@/ui/icons';
import { SelectReportModal } from '@/domain/reports';

// The R&R form Export/Print action (spec/rnr-forms/ui-surface.md S3 → reports
// S4): the trigger + the reports vertical's shared record-report selector,
// bound to the REQUISITION context narrowed to the R&R sub-context (contract §
// permissions and store context — the report registration this picker lists).
// Printing is a read, offered on every status (OMS-REG-REPL-07.43/.44).
export const ExportPrintRnrFormAction: Component<{
  rnrFormId: string;
}> = props => {
  const [open, setOpen] = createSignal(false);
  return (
    <>
      <Button
        variant="secondary"
        icon={<PrinterIcon />}
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
          extraFilter={{ subContext: { equalTo: 'R&R' } }}
          dataId={props.rnrFormId}
          onClose={() => setOpen(false)}
        />
      </Show>
    </>
  );
};
