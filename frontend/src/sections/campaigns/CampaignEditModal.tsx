import { createSignal, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { generateUUID } from '@/uuid';
import { graphqlFetch } from '@/api/graphql';
import { t } from '@/intl';
import { translateServerError } from '@/intl/intlUtils';
import { Dialog } from '@/ui/elements/feedback/Dialog';
import { Alert } from '@/ui/elements/feedback/Alert';
import { Stack } from '@/ui/layout/Stack/Stack';
import { FieldRow } from '@/ui/elements/inputs/FieldRow';
import { TextField } from '@/ui/elements/inputs/TextField';
import { DateField } from '@/ui/elements/inputs/DateField';
import {
  CancelButton,
  DialogSaveButton,
} from '@/ui/elements/buttons/StandardButtons';
import { UpsertCampaign } from './campaigns.generated';
import type { Campaign } from './campaignRegister';
import {
  campaignInput,
  campaignSaveOutcome,
  canSaveCampaign,
  draftFromCampaign,
  newCampaignDraft,
  type CampaignDraft,
} from './campaignEditor';

// The campaign editor — spec/campaigns S2. ONE dialog for create and edit,
// because they are the same whole-record write: the only difference is whether
// an existing campaign is being written over, and that is decided by which id
// the draft carries.
//
// Lifecycle is the shared dialog contract (ui-standards controls.md § dialogs,
// D22): it stays open while the save is in flight with the Save button busy,
// closes on success — closure plus the register refreshing IS the confirmation,
// never a toast (D21) — and stays open on rejection with the entered values
// preserved and the message inline beside the actions (S4).

export interface CampaignEditModalProps {
  /** The campaign being edited; omit to create a new one. */
  campaign?: Campaign;
  /** Cancel / dismiss — nothing is saved and the register is untouched. */
  onClose: () => void;
  /** The save succeeded: the owner closes the dialog and refreshes. */
  onSaved: () => void;
}

export const CampaignEditModal: Component<CampaignEditModalProps> = props => {
  // The draft is seeded ONCE, on mount (the owner mounts this only while open),
  // so a rejected save keeps exactly what the user entered. A create generates
  // its own id client-side — the upsert has no insert/update split, so the
  // client always supplies one.
  const [draft, setDraft] = createSignal<CampaignDraft>(
    props.campaign
      ? draftFromCampaign(props.campaign)
      : newCampaignDraft(generateUUID())
  );
  const [saving, setSaving] = createSignal(false);
  // The active rejection, as already-translated text. Cleared when a new save
  // starts, so a stale message never sits over a fresh attempt.
  const [error, setError] = createSignal<string | undefined>(undefined);

  const isEdit = () => props.campaign !== undefined;

  const save = async () => {
    if (saving() || !canSaveCampaign(draft())) return; // re-entry guard
    setSaving(true);
    setError(undefined);
    // returnGraphqlErrors, because the dates-out-of-order rejection is UNTYPED:
    // without it that rejection would trip the global unexpected-error modal
    // instead of surfacing inline, which is exactly the S4 contract broken.
    const result = await graphqlFetch(
      UpsertCampaign,
      { input: campaignInput(draft()) },
      { returnGraphqlErrors: true }
    );
    const outcome = campaignSaveOutcome(result);
    setSaving(false);
    switch (outcome.kind) {
      case 'saved':
        props.onSaved();
        return;
      case 'duplicate-name':
        // Keyed to the Name field: its own message, not the generic one.
        setError(t('messages.error-campaign-name-already-exists'));
        return;
      case 'rejected':
        // The generic save message with the server's own description appended —
        // `InvalidDates` resolves through the server-error table ("Invalid
        // dates"); a plain description passes through.
        setError(
          `${t('messages.error-saving-campaign')} ${translateServerError(
            outcome.serverError
          )}`
        );
        return;
      case 'failed':
        // Already surfaced by the global modal; the busy state is released
        // above and the entered values stay put.
        return;
    }
  };

  return (
    <Dialog
      open
      testId="campaign-edit-modal"
      title={isEdit() ? t('title.edit-campaign') : t('title.create-campaign')}
      // Blocking while the mutation is in flight: no scrim/Escape exit until it
      // resolves.
      dismissable={!saving()}
      onClose={props.onClose}
      width="prose"
      // The error banner sits on the inline-START of the actions row, opposite
      // the buttons (ui-surface S2 § Layout).
      actionsLead={
        <Show when={error()}>
          <Alert severity="error" testId="campaign-save-error">
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
          {/* Save, not OK (D55) — inert until Name holds a value, busy while
              saving. */}
          <DialogSaveButton
            data-testid="dialog-button-save"
            disabled={!canSaveCampaign(draft())}
            loading={saving()}
            onClick={() => void save()}
          />
        </>
      }
    >
      {/* The field rows as ONE vertical stack (ui-surface S2 § Layout). The
          dialog's own `width="prose"` measure owns the width cap — a
          DetailContainer inside would double-pad and re-cap content the frame
          already measures (the sites editor records the same resolution). */}
      <Stack>
        <FieldRow label={t('label.name')} required>
          <TextField
            label={t('label.name')}
            hideLabel
            required
            width="full"
            data-testid="campaign-name-input"
            disabled={saving()}
            value={draft().name}
            onInput={e => setDraft({ ...draft(), name: e.currentTarget.value })}
            // The name is stored as entered, so it is trimmed as the field is
            // LEFT — a name saved from this app never carries surrounding
            // whitespace (rules § creating and editing). The save trims too;
            // this is what makes the trim visible to the user.
            onBlur={() => setDraft({ ...draft(), name: draft().name.trim() })}
          />
        </FieldRow>
        {/* Both dates optional and independently clearable, and NEITHER is
              bounded by the other: entering a start later than the end is
              possible and is rejected on save, because the ordering rule is the
              server's (rules § the campaign period). */}
        <FieldRow label={t('label.start-date')}>
          <DateField
            label={t('label.start-date')}
            hideLabel
            width="full"
            testId="campaign-start-date-input"
            disabled={saving()}
            value={draft().startDate ?? null}
            onChange={value => setDraft({ ...draft(), startDate: value })}
          />
        </FieldRow>
        <FieldRow label={t('label.end-date')}>
          <DateField
            label={t('label.end-date')}
            hideLabel
            width="full"
            testId="campaign-end-date-input"
            disabled={saving()}
            value={draft().endDate ?? null}
            onChange={value => setDraft({ ...draft(), endDate: value })}
          />
        </FieldRow>
      </Stack>
    </Dialog>
  );
};
