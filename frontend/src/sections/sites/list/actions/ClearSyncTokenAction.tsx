import { createSignal } from 'solid-js';
import type { Component } from 'solid-js';
import { graphqlFetch } from '@/api/graphql';
import { t } from '@/intl';
import { Button } from '@/ui/elements/buttons/Button';
import { ConfirmDialog } from '@/ui/elements/feedback/ConfirmDialog';
import { ClearSiteToken } from '../sites.generated';

// Clear Sync Token (spec/sites/ui-surface.md S2 § pairing actions): the whole
// content of its own field row, behind the same confirmation shape as the
// hardware-id clear (OMS-FUN-SYC-002.25).
//
// Clearing the token invalidates the site's session, so the remote must
// authenticate with its site name and password again before it can sync
// (OMS-FUN-SYC-002.5) — and its hardware id survives (OMS-FUN-SYC-002.27). The
// token itself is not exposed anywhere in the schema: only the action that
// clears it, which is why this row shows no value.
//
// Same untyped-rejection reasoning as the hardware-id clear — see that file.

export interface ClearSyncTokenActionProps {
  siteId: number;
  /** The token is gone. Nothing visible in the editor changes. */
  onCleared: () => void;
}

export const ClearSyncTokenAction: Component<
  ClearSyncTokenActionProps
> = props => {
  const [confirming, setConfirming] = createSignal(false);
  const [busy, setBusy] = createSignal(false);

  const run = async () => {
    if (busy()) return; // re-entry guard
    setBusy(true);
    const result = await graphqlFetch(ClearSiteToken, { siteId: props.siteId });
    setBusy(false);
    if (result.kind === 'success') props.onCleared();
  };

  return (
    <>
      <Button
        // Destructive tone: it mutates the server the moment it is confirmed,
        // outside the editor's Save, and cancelling the editor cannot undo it.
        variant="danger"
        loading={busy()}
        data-testid="clear-sync-token-button"
        onClick={() => setConfirming(true)}
      >
        {t('label.clear-sync-token')}
      </Button>
      <ConfirmDialog
        open={confirming()}
        onClose={() => setConfirming(false)}
        title={t('heading.are-you-sure')}
        message={t('messages.confirm-clear-sync-token')}
        onConfirm={() => void run()}
      />
    </>
  );
};
