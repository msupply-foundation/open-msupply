import { createSignal, Show, type Component } from 'solid-js';
import { t } from '../../../../intl';
import { Button } from '../../../../ui/elements/buttons/Button';
import { PrinterIcon } from '../../../../ui/icons';
import { SelectReportModal, type ReportSort } from '../../../../domain/reports';

// The stocktake detail-view Export/Print action (spec/stocktakes S3 →
// spec/reports S4): the header trigger button, plus the shared "Select a form"
// dialog (owned by the reports vertical). Peer of the other detail actions
// (self-contained button + modal, kdd/action-modal) — the reports vertical owns
// the dialog/generation/printing, this only names the trigger and passes the
// stocktake id + the line table's current sort.

export interface ExportPrintActionProps {
  /** The stocktake the reports render against. */
  stocktakeId: string;
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
        onClick={() => setOpen(true)}
      >
        {t('button.export-or-print')}
      </Button>
      <Show when={open()}>
        <SelectReportModal
          context="STOCKTAKE"
          dataId={props.stocktakeId}
          sort={props.sort}
          onClose={() => setOpen(false)}
        />
      </Show>
    </>
  );
};
