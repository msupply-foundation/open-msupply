import { createSignal, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { t } from '@/intl';
import { Button } from '@/ui/elements/buttons/Button';
import { TrashIcon } from '@/ui/icons';
import { SiteDeleteFlow } from './SiteDeleteFlow';
import type { SiteRow } from '../siteEdit';

// The register's bulk delete (spec/sites/ui-surface.md S1 § bulk actions) — the
// danger button in the selection footer, opening the shared delete flow over
// the whole selection. The footer itself only exists on a standalone central,
// since the selection column does (OMS-FUN-SYC-002.15).

export interface DeleteSitesActionProps {
  /** The selected rows, live — snapshotted when the dialog opens. */
  rows: () => SiteRow[];
  /**
   * The interaction ended: clear the selection and re-read the register. Called
   * on a wholly successful delete and on dismissing a partial-failure report.
   */
  onFinished: () => void;
  /**
   * Some sites were deleted and some refused: re-read the register BEHIND the
   * report (the deleted ones are already gone) but keep the selection, so the
   * user can retry after moving the blocking stores off.
   */
  onPartiallyRefused: () => void;
}

export const DeleteSitesAction: Component<DeleteSitesActionProps> = props => {
  const [open, setOpen] = createSignal(false);

  return (
    <>
      {/* A destructive action carries the danger tone wherever it is offered
          (ui-standards/controls.md). */}
      <Button
        variant="danger"
        icon={<TrashIcon />}
        data-testid="delete-lines-button"
        onClick={() => setOpen(true)}
      >
        {t('button.delete-lines')}
      </Button>
      {/* Mounted only while open, so its `confirmation-modal` id is unique in the
          document while it applies (e2e/TESTIDS.md). */}
      <Show when={open()}>
        <SiteDeleteFlow
          rows={props.rows()}
          onCancel={() => setOpen(false)}
          onAllDeleted={() => {
            // Close BEFORE clearing the selection: clearing unmounts the
            // selection-gated footer this dialog lives in.
            setOpen(false);
            props.onFinished();
          }}
          onPartiallyDeleted={props.onPartiallyRefused}
          onReportDismissed={() => {
            setOpen(false);
            props.onFinished();
          }}
        />
      </Show>
    </>
  );
};
