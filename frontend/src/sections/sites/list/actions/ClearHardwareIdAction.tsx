import { createSignal } from 'solid-js';
import type { Component } from 'solid-js';
import { graphqlFetch } from '@/api/graphql';
import { t } from '@/intl';
import { Button } from '@/ui/elements/buttons/Button';
import { ConfirmDialog } from '@/ui/elements/feedback/ConfirmDialog';
import { ClearSiteHardwareId } from '../sites.generated';

// Clear Hardware ID (spec/sites/ui-surface.md S2 § pairing actions): the async
// button at the end of the Hardware ID row, behind a confirmation naming the
// consequence (OMS-FUN-SYC-002.25 — cancelling does nothing).
//
// It applies IMMEDIATELY on confirming — it is not part of the editor's Save,
// and cancelling the editor afterwards does not undo it. Releasing the site
// from its current device lets a different device pair as that site
// (OMS-FUN-SYC-002.4) and leaves everything else — the token included — intact
// (OMS-FUN-SYC-002.26).
//
// The mutation carries NO error type at all, so every rejection is a top-level
// "Bad user input" (contract.md ⚠️ wire trap) and reaches the app's generic
// unexpected-error handling — which is why this action is only rendered where
// the two server conditions already hold (sitePairing.showsClearHardwareId).
// The default graphqlFetch path is therefore deliberate: there is no typed
// branch to match and nothing useful to say in place.

export interface ClearHardwareIdActionProps {
  siteId: number;
  /** The hardware id is now empty — the editor reflects it straight away. */
  onCleared: () => void;
}

export const ClearHardwareIdAction: Component<
  ClearHardwareIdActionProps
> = props => {
  const [confirming, setConfirming] = createSignal(false);
  const [busy, setBusy] = createSignal(false);

  const run = async () => {
    if (busy()) return; // re-entry guard
    setBusy(true);
    const result = await graphqlFetch(ClearSiteHardwareId, {
      siteId: props.siteId,
    });
    setBusy(false);
    if (result.kind === 'success') props.onCleared();
  };

  return (
    <>
      <Button
        variant="secondary"
        loading={busy()}
        data-testid="clear-hardware-id-button"
        onClick={() => setConfirming(true)}
      >
        {t('label.clear-hardware-id')}
      </Button>
      <ConfirmDialog
        open={confirming()}
        onClose={() => setConfirming(false)}
        title={t('heading.are-you-sure')}
        message={t('messages.confirm-clear-hardware-id')}
        onConfirm={() => void run()}
      />
    </>
  );
};
