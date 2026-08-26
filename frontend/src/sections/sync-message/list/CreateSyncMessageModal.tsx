import { createSignal, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { generateUUID } from '@/uuid';
import { StoreSearch } from '@/domain/store';
import { graphqlFetch } from '@/api/graphql';
import { t } from '@/intl';
import { Dialog } from '@/ui/elements/feedback/Dialog';
import { Alert } from '@/ui/elements/feedback/Alert';
import { Checkbox } from '@/ui/elements/inputs/Checkbox';
import { Select } from '@/ui/elements/selectors/Select';
import { FormSection } from '@/ui/layout/Form/FormSection';
import { LabelledValue } from '@/ui/elements/typography/LabelledValue';
import {
  CancelButton,
  DialogSaveButton,
} from '@/ui/elements/buttons/StandardButtons';
import { PlusCircleIcon } from '@/ui/icons';
import { InsertSyncMessage } from './syncMessages.generated';
import {
  AUTHORABLE_TYPES,
  EMPTY_FORM,
  buildBody,
  buildInsertInput,
  createOutcome,
  kindTakesArtefacts,
  type SyncMessageForm,
} from './syncMessageCreate';
import { authorableTypeLabel } from './syncMessageLabels';


/*
 * S2 — the create-message modal (spec/sync-message/ui-surface.md S2): author a
 * support upload against one destination store. The register mounts it fresh
 * per open (a <Show> around it), so the form seeds once.
 *
 * Everything here is the author's three inputs — destination, kind, artefacts;
 * the body is DERIVED from the ticks and shown back read-only, and the server
 * fixes sender / created moment / status (rules § creating a message).
 */

export interface CreateSyncMessageModalProps {
  storeId: string;
  onClose: () => void;
  /** A message was created — the register re-queries so it appears at the top
   *  of the default ordering. */
  onCreated: () => void;
}

export const CreateSyncMessageModal: Component<
  CreateSyncMessageModalProps
> = props => {
  const [form, setForm] = createSignal<SyncMessageForm>(EMPTY_FORM);
  const [saving, setSaving] = createSignal(false);
  // The inline save-rejection banner. Both server rejections map to this one
  // message (ui-surface S4) — neither is reachable through ordinary use, so
  // neither earns its own copy.
  const [failed, setFailed] = createSignal(false);

  const artefactsEnabled = () => kindTakesArtefacts(form().type);

  const save = async () => {
    if (saving()) return; // re-entry guard
    setSaving(true);
    setFailed(false);
    // The identity is minted by the CLIENT (rules § creating a message).
    const result = await graphqlFetch(
      InsertSyncMessage,
      {
        storeId: props.storeId,
        input: buildInsertInput(form(), generateUUID()),
      },
      // InsertSyncMessageResponse is a single-member union, so BOTH service
      // rejections (SyncMessageAlreadyExists, ToStoreDoesNotExist) arrive as
      // top-level GraphQL errors — there is no typed error branch to read
      // (contract ⚠️ wire trap). Handling them here keeps the modal open with
      // the draft intact (OMS-REG-MNG-05.15, D22) instead of tripping the
      // global unexpected-error modal over a rejection this screen can state.
      { returnGraphqlErrors: true }
    );
    setSaving(false);
    if (createOutcome(result) === 'rejected') {
      setFailed(true);
      return;
    }
    props.onCreated();
    // Success closes the dialog — closure IS the confirmation (D21).
    props.onClose();
  };

  return (
    <Dialog
      open
      testId="create-sync-message-modal"
      title={t('title.create-message')}
      icon={<PlusCircleIcon />}
      width="form"
      // Blocking while the mutation is in flight (no scrim/Escape exit until
      // it resolves).
      dismissable={!saving()}
      onClose={props.onClose}
      footer={
        <Show when={failed()}>
          <Alert severity="error" testId="sync-message-save-error">
            {t('error.failed-to-create-sync-message')}
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
          <DialogSaveButton
            data-testid="dialog-button-ok"
            loading={saving()}
            disabled={saving()}
            onClick={() => void save()}
          />
        </>
      }
    >
      {/* Body, top to bottom, per ui-surface S2 § layout. Each field stands
          alone, so it uses the control's own label. */}
      <StoreSearch
        label={t('label.to-store')}
        disabled={saving()}
        selected={form().toStore}
        onSelect={store => setForm({ ...form(), toStore: store ?? undefined })}
      />
      {/* Exactly one option today, preselected; the contract admits no other
          (SyncMessageRowTypeInput has a single member), so the choice is
          enforced by the wire, not by client filtering. */}
      <Select
        label={t('label.type')}
        disabled={saving()}
        value={form().type}
        options={AUTHORABLE_TYPES.map(type => ({
          value: type,
          label: authorableTypeLabel(type),
        }))}
        onValueChange={value =>
          setForm({ ...form(), type: value as SyncMessageForm['type'] })
        }
      />
      {/* The two artefacts: independent, either / both / neither valid. A kind
          that takes none renders them DISABLED rather than hidden — they are
          the kind's own fields (ui-surface S2 § artefacts). The dialog's own
          title holds the h2, so this group takes h3 (and its quieter
          treatment, being one label above two controls rather than a ruled
          section of a page-sized form). */}
      <FormSection
        title={t('label.include')}
        headingLevel="h3"
        heading="subgroup"
      >
        <Checkbox
          label={t('label.logs')}
          testId="sync-message-logs-checkbox"
          disabled={saving() || !artefactsEnabled()}
          checked={form().logs}
          onChange={logs => setForm({ ...form(), logs })}
        />
        <Checkbox
          label={t('label.database-sqlite')}
          testId="sync-message-database-checkbox"
          disabled={saving() || !artefactsEnabled()}
          checked={form().database}
          onChange={database => setForm({ ...form(), database })}
        />
      </FormSection>
      {/* The derived body, shown back. Read-only because the KIND derives it —
          not because the record is locked — so it renders as a read-only
          labelled value rather than a disabled input (D67). */}
      <LabelledValue
        variant="field"
        label={t('label.sync-message-body')}
        data-testid="sync-message-body"
        style={{ 'white-space': 'pre-wrap' }}
      >
        {buildBody(form())}
      </LabelledValue>
    </Dialog>
  );
};
