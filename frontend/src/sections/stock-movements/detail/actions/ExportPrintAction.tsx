import { createSignal, Show, type Component } from 'solid-js';
import { t } from '@/intl';
import { Button } from '@/ui/elements/buttons/Button';
import { PrinterIcon } from '@/ui/icons';
import { SelectReportModal } from '@/domain/reports';

// The detail-view Export/Print action (spec/stock-movements/ui-surface.md S2
// → spec/reports S4): the shared "Select a form" dialog over the
// STOCK_MOVEMENT report context. Available at every status.

export interface ExportPrintActionProps {
  movementId: string;
  /**
   * Leading available action once Add line hides (finalised) — then carries
   * the region's single primary emphasis (ui-standards/controls.md).
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
          context="STOCK_MOVEMENT"
          dataId={props.movementId}
          onClose={() => setOpen(false)}
        />
      </Show>
    </>
  );
};
