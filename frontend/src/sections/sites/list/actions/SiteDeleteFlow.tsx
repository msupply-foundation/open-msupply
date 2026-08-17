import { createSignal, For, Match, Show, Switch } from 'solid-js';
import type { Component } from 'solid-js';
import { graphqlFetch } from '@/api/graphql';
import { t, tPlural } from '@/intl';
import { Dialog } from '@/ui/elements/feedback/Dialog';
import { Alert } from '@/ui/elements/feedback/Alert';
import { Button } from '@/ui/elements/buttons/Button';
import { CancelButton } from '@/ui/elements/buttons/StandardButtons';
import { TrashIcon } from '@/ui/icons';
import { DeleteSite } from '../sites.generated';
import {
  allDeleted,
  deleteOutcome,
  summariseOutcomes,
  type DeleteSummary,
  type RefusalReason,
} from '../deleteSites';
import type { SiteRow } from '../siteEdit';

// The confirm → deleting → report dialog shared by the register's bulk delete
// and the editor's own Delete (spec/sites/rules.md § deletion: "Deletion is
// offered in two places, and they behave differently" — the DIALOG is the same,
// what happens after a wholly-successful one is not, which is what `onFinished`
// is for).
//
// Deletion is per-site, NOT atomic (OMS-FUN-SYC-002.40): each selected site is
// deleted independently, so the deletable ones go and the refused ones are
// reported together — one notice per site, by NAME, with its reason. There is
// no batch operation for sites, so this is N calls, and each takes its GraphQL
// errors back rather than letting one untyped refusal (SiteDoesNotExist,
// NotStandaloneCentral — contract.md ⚠️ wire trap) trip the global
// unexpected-error modal mid-bulk. The outcome lands in the initiating surface
// (D21).
//
// A wholly successful delete needs no announcement: the dialog closes, the rows
// leave the register (D21 — closure IS the confirmation; the spec's success
// toast is not available to this app, see BUILD_REPORT). Any refusal switches
// the dialog to the report instead, and the SELECTION IS KEPT so the user can
// retry after fixing the cause — clearing it here would also unmount the
// selection-gated footer this dialog lives in, disposing the dialog before the
// report renders (the same trap as the locations reference, issue #374).

type Phase =
  | { kind: 'confirm' }
  | { kind: 'deleting' }
  | { kind: 'report'; summary: DeleteSummary };

export interface SiteDeleteFlowProps {
  /** The sites to delete — snapshotted by the caller at open. */
  rows: SiteRow[];
  /** Dismissed without deleting anything. */
  onCancel: () => void;
  /** Every site went. The caller decides what that means for its surface. */
  onAllDeleted: () => void;
  /**
   * Some went, some were refused — the register must re-read behind the report
   * because the deleted ones are already gone.
   */
  onPartiallyDeleted: () => void;
  /** The report was acknowledged: the interaction has ended. */
  onReportDismissed: () => void;
}

/**
 * OMS-FUN-SYC-002.37/.39 — each refusal's own message; anything else generic.
 */
const refusalMessage = (reason: RefusalReason): string => {
  switch (reason) {
    case 'hasStores':
      return t('error.site-has-stores');
    case 'centralSite':
      return t('error.cannot-delete-central-site');
    case 'other':
      return t('error.unable-to-delete-site');
  }
};

export const SiteDeleteFlow: Component<SiteDeleteFlowProps> = props => {
  const [phase, setPhase] = createSignal<Phase>({ kind: 'confirm' });
  // Rows snapshotted on mount (the caller mounts this once per open) so the
  // message and the id → name labelling can't shift behind the dialog.
  const rows = props.rows;

  const nameFor = (id: number): string =>
    rows.find(row => row.id === id)?.name ?? String(id);

  const run = async () => {
    if (phase().kind !== 'confirm') return; // re-entry guard
    setPhase({ kind: 'deleting' });
    // N independent calls, sequentially: a site with stores never blocks the
    // rest.
    const outcomes = [];
    for (const row of rows) {
      const result = await graphqlFetch(
        DeleteSite,
        { siteId: row.id },
        { returnGraphqlErrors: true }
      );
      outcomes.push(deleteOutcome(row.id, result));
    }
    const summary = summariseOutcomes(outcomes);
    if (allDeleted(summary)) {
      props.onAllDeleted();
      return;
    }
    props.onPartiallyDeleted();
    setPhase({ kind: 'report', summary });
  };

  const report = () => {
    const current = phase();
    return current.kind === 'report' ? current.summary : undefined;
  };

  return (
    <Dialog
      open
      // Blocking while the deletes are in flight, and the report must be
      // acknowledged (ui-surface S1 § bulk actions: a BLOCKING alert).
      dismissable={phase().kind === 'confirm'}
      onClose={props.onCancel}
      icon={<TrashIcon />}
      testId="confirmation-modal"
      title={t('heading.are-you-sure')}
      description={
        <Switch
          // Confirm / deleting: the count-aware confirmation. The editor's own
          // Delete uses this same dialog with a count of one (ui-surface S2
          // § layout).
          fallback={tPlural('messages.confirm-delete-sites', rows.length)}
        >
          <Match when={report()}>
            {summary => (
              <>
                <Show when={summary().deletedCount > 0}>
                  <p>
                    {tPlural('messages.deleted-sites', summary().deletedCount)}
                  </p>
                </Show>
                {/* Each refusal by site NAME with its reason
                    (OMS-FUN-SYC-002.40). */}
                <For each={summary().refused}>
                  {refusal => (
                    <Alert severity="error" testId="site-delete-refused">
                      {`${nameFor(refusal.id)}: ${refusalMessage(refusal.reason)}`}
                    </Alert>
                  )}
                </For>
              </>
            )}
          </Match>
        </Switch>
      }
      actions={
        <Show
          when={report()}
          fallback={
            <>
              <Show when={phase().kind === 'confirm'}>
                <CancelButton onClick={props.onCancel} />
              </Show>
              {/* Nothing is deleted until the confirmation is accepted. */}
              <Button
                variant="danger"
                confirms="plain"
                data-testid="confirmation-modal-ok"
                loading={phase().kind === 'deleting'}
                onClick={() => void run()}
              >
                {t('button.ok')}
              </Button>
            </>
          }
        >
          <Button
            variant="secondary"
            confirms="plain"
            onClick={props.onReportDismissed}
          >
            {t('button.close')}
          </Button>
        </Show>
      }
    />
  );
};
