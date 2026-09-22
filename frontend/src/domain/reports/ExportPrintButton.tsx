import { createSignal, Show, splitProps, type Component } from 'solid-js';
import { t } from '@/intl';
import { Button } from '@/ui/elements/buttons/Button';
import { PrinterIcon } from '@/ui/icons';
import {
  SelectReportModal,
  type SelectReportModalProps,
} from './SelectReportModal';

export type ExportPrintButtonProps = Omit<SelectReportModalProps, 'onClose'>;

// A record screen's Export/Print page action (spec/reports S4): the header
// trigger plus the shared "Select a form" dialog. A host names only the
// report context, the record and whatever the generation needs seeded.
export const ExportPrintButton: Component<ExportPrintButtonProps> = props => {
  const [open, setOpen] = createSignal(false);
  const [, modalProps] = splitProps(props, []);
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
        <SelectReportModal {...modalProps} onClose={() => setOpen(false)} />
      </Show>
    </>
  );
};
