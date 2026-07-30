import { createSignal, Show, type Component } from 'solid-js';
import { t } from '../../../../intl';
import { Button } from '../../../../ui/elements/buttons/Button';
import { PrinterIcon } from '../../../../ui/icons';
import { SelectReportModal } from '../../../../domain/reports';

// The supplier-return detail-view Export/Print action (spec/supplier-returns S3
// → spec/reports S4): the header trigger button, plus the shared "Select a
// form" dialog (owned by the reports vertical). The reports vertical owns
// generation/printing; this only names the trigger and passes the return id.
// Available at every status.

export interface ExportPrintActionProps {
  /** The return the reports render against. */
  returnId: string;
  /**
   * This is the header cluster's leading AVAILABLE action — Add item is hidden,
   * so the return is read-only. It then carries the region's single primary
   * emphasis; alongside Add item it steps back to secondary
   * (ui-standards/controls.md — one primary action per region).
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
          context="SUPPLIER_RETURN"
          dataId={props.returnId}
          onClose={() => setOpen(false)}
        />
      </Show>
    </>
  );
};
