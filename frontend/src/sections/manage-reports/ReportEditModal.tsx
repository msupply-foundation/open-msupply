import { createSignal, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { graphqlFetch } from '@/api/graphql';
import { t } from '@/intl';
import { translateServerError } from '@/intl/intlUtils';
import { Dialog } from '@/ui/elements/feedback/Dialog';
import { Alert } from '@/ui/elements/feedback/Alert';
import { Stack } from '@/ui/layout/Stack/Stack';
import { FieldRow } from '@/ui/elements/inputs/FieldRow';
import { Checkbox } from '@/ui/elements/inputs/Checkbox';
import {
  CancelButton,
  DialogSaveButton,
} from '@/ui/elements/buttons/StandardButtons';
import { UpdateReport } from './manageReports.generated';
import type { ReportVersion } from './reportRegister';
import {
  canSaveReport,
  draftFromVersion,
  reportSaveOutcome,
  reportUpdateInput,
  type ReportEditDraft,
} from './reportEditor';

// The report-version editor — spec/manage-reports S3.
//
// Everything but the active state is READ-ONLY, and that is the contract, not
// a layout choice: `UpdateReportInput` is `{ id, isActive }`, so no other
// property of an installed report is writable anywhere in the schema
// (OMS-REG-MNG-06.21). A version is corrected by installing over it, never by
// editing here.
//
// Lifecycle is the shared dialog contract (ui-standards controls.md § dialogs):
// open while the save is in flight with Save busy, closed on success — closure
// plus the register refreshing IS the confirmation — and open on rejection with
// the message inline beside the actions.

export interface ReportEditModalProps {
  /** The version being edited. */
  version: ReportVersion;
  /** Cancel / dismiss — nothing is saved and the register is untouched. */
  onClose: () => void;
  /** The save succeeded: the owner closes the dialog and refreshes. */
  onSaved: () => void;
}

export const ReportEditModal: Component<ReportEditModalProps> = props => {
  // Seeded ONCE, on mount (the owner mounts this only while open), so a
  // rejected save keeps what the user chose.
  const [draft, setDraft] = createSignal<ReportEditDraft>(
    draftFromVersion(props.version)
  );
  const [saving, setSaving] = createSignal(false);
  const [error, setError] = createSignal<string | undefined>(undefined);

  const save = async () => {
    if (saving() || !canSaveReport(draft(), props.version)) return; // re-entry guard
    setSaving(true);
    setError(undefined);
    // returnGraphqlErrors, because the one domain rejection — an id that is no
    // longer an installed version — is UNTYPED. Without it that rejection
    // would trip the global unexpected-error modal instead of surfacing here.
    const result = await graphqlFetch(
      UpdateReport,
      { input: reportUpdateInput(draft()) },
      { returnGraphqlErrors: true }
    );
    const outcome = reportSaveOutcome(result);
    setSaving(false);
    switch (outcome.kind) {
      case 'saved':
        props.onSaved();
        return;
      case 'rejected':
        // The server's own description, passed through — no client-side
        // message is invented for a rejection the reference app also surfaces
        // raw (error-handling parity). translateServerError resolves a token
        // and lets a plain description through unchanged.
        setError(translateServerError(outcome.serverError));
        return;
      case 'failed':
        // Already surfaced by the global modal; the busy state is released
        // above and the choice stays put.
        return;
    }
  };

  return (
    <Dialog
      open
      testId="report-edit-modal"
      title={t('title.edit-report')}
      dismissable={!saving()}
      onClose={props.onClose}
      width="prose"
      actionsLead={
        <Show when={error()}>
          <Alert severity="error" testId="report-save-error">
            {error()}
          </Alert>
        </Show>
      }
      actions={
        <>
          <Show when={!saving()}>
            <CancelButton
              data-testid="dialog-button-cancel"
              onClick={props.onClose}
            />
          </Show>
          {/* Inert until the active state actually DIFFERS from the stored one
              (OMS-REG-MNG-06.17) — so reopening and closing a version cannot
              rewrite the row. */}
          <DialogSaveButton
            data-testid="dialog-button-save"
            disabled={!canSaveReport(draft(), props.version)}
            loading={saving()}
            onClick={() => void save()}
          />
        </>
      }
    >
      <Stack>
        {/* Read-only identity. Code and context are deliberately absent — the
            reference editor shows neither (ui-surface S3). */}
        <FieldRow label={t('label.name')}>
          <span data-testid="report-name">{props.version.name}</span>
        </FieldRow>
        <FieldRow label={t('label.version')}>
          <span data-testid="report-version">{props.version.version}</span>
        </FieldRow>
        <FieldRow label={t('label.custom')}>
          <span data-testid="report-custom">
            {props.version.isCustom ? t('messages.yes') : t('messages.no')}
          </span>
        </FieldRow>
        {/* The one editable property. Labelled "Enabled" here while the
            register's column calls it "Status" — the reference app's own
            split, captured as-is (ui-surface § cross-cutting).

            Not wrapped in a FieldRow: the Checkbox carries its own label, and
            a FieldRow around it would name the control twice in the
            accessibility tree (C4). */}
        <Checkbox
          label={t('label.enabled')}
          testId="report-enabled-checkbox"
          disabled={saving()}
          checked={draft().isActive}
          onChange={checked => setDraft({ ...draft(), isActive: checked })}
        />
      </Stack>
    </Dialog>
  );
};
