import { createResource, createSignal, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { graphqlFetch } from '@/api/graphql';
import { t } from '@/intl';
import { Dialog } from '@/ui/elements/feedback/Dialog';
import { Alert } from '@/ui/elements/feedback/Alert';
import { ErrorDetails } from '@/ui/elements/feedback/ErrorDetails';
import {
  CancelButton,
  DialogSaveButton,
} from '@/ui/elements/buttons/StandardButtons';
import { TextField } from '@/ui/elements/inputs/TextField';
import { PasswordField } from '@/ui/elements/inputs/PasswordField';
import { FieldRow } from '@/ui/elements/inputs/FieldRow';
import { Stack } from '@/ui/layout/Stack/Stack';
import { HStack } from '@/ui/layout/Stack/HStack';
import { PlusCircleIcon } from '@/ui/icons';
import { createFocusTarget } from '@/ui/utils/createFocusTarget';
import {
  AssignStoresToSite,
  StoresBySite,
  UpsertSite,
} from './sites.generated';
import {
  EMPTY_FORM,
  buildUpsertInput,
  formFromSite,
  isFormValid,
  proposedSiteId,
  storeDraftChange,
  storeRemovalAllowed,
  upsertRejection,
  type SaveRejection,
  type SiteFormState,
  type SiteRow,
  type SiteStore,
} from './siteEdit';
import { runSiteSave } from './siteSave';
import {
  multiDeviceFlagEnabled,
  showsClearHardwareId,
  showsPairingControls,
} from './sitePairing';
import { siteAffordances } from './siteGates';
import { SiteStoresSection } from './SiteStoresSection';
import {
  ClearHardwareIdAction,
  ClearSyncTokenAction,
  DeleteSiteAction,
  MultiDeviceSwitch,
} from './actions';

// S2 — the site editor (spec/sites/ui-surface.md). ONE modal for both modes,
// the title telling them apart; there is no per-site route, so everything a
// site can have done to it happens here.
//
// Three independent gates decide what renders:
//
//  • STANDALONE central — the password row, the store picker, the per-store
//    remove, Save and Delete are ABSENT otherwise, and Code/Name render
//    disabled-with-value (ui-surface § cross-cutting: read-only mode is a
//    content difference, not a disabled state, except the identity inputs).
//  • existing site — the pairing rows and Delete exist only on a site that
//    already does.
//  • the pairing conditions — a current-flow (V7) site that is not this
//    server's own (sitePairing.ts).

/** What the editor was opened on: a fresh create, or a clicked register row. */
export type EditorState = { mode: 'create' } | { mode: 'edit'; site: SiteRow };

export interface SiteEditModalProps {
  /** Snapshot at open — the form seeds from it once. */
  editor: EditorState;
  /**
   * The register rows currently loaded — a create PROPOSES its id from them
   * (rules.md § site identity; captured as-is, collisions included).
   */
  loadedSites: () => SiteRow[];
  isStandalone: boolean;
  /** The server's own site: no pairing action may target it. */
  ownSiteId: number | undefined;
  /** The register's root — where removed stores are handed back to. */
  centralSiteId: number;
  /** `Query.featureFlags`, arbitrary JSON — narrowed in sitePairing.ts. */
  featureFlags: unknown;
  onClose: () => void;
  /** Something committed: the register re-reads so its rows reflect it. */
  onChanged: () => void;
}

export const SiteEditModal: Component<SiteEditModalProps> = props => {
  const opened = props.editor;
  const isEdit = opened.mode === 'edit';

  // The site being edited. A SIGNAL, not the prop: the three pairing actions
  // commit immediately and the editor must reflect a cleared hardware id or a
  // flipped multi-device switch STRAIGHT AWAY, without waiting for the register
  // to reload (ui-surface S2 § pairing actions). The upsert's returned SiteNode
  // lands here too, so a save leaves the editor showing what was stored.
  const [site, setSite] = createSignal<SiteRow | undefined>(
    opened.mode === 'edit' ? opened.site : undefined
  );
  const [form, setForm] = createSignal<SiteFormState>(
    opened.mode === 'edit' ? formFromSite(opened.site) : EMPTY_FORM
  );
  const [saving, setSaving] = createSignal(false);
  // The save rejection, shown as an inline banner inside the dialog with the
  // user's input preserved (ui-standards/controls.md § dialogs, D21/D22). The
  // spec describes an error TOAST here; the toast role is reserved and MUST NOT
  // carry a user-initiated action's outcome, so the banner is the honoured
  // divergence — see BUILD_REPORT.
  const [rejection, setRejection] = createSignal<SaveRejection>();

  // Code is the first field and the modal's initial focus (ui-surface S2 field
  // order); a native `autofocus` can't serve it — inside a Dialog the panel
  // claims it.
  const codeField = createFocusTarget();

  // The site's assigned stores. Fetched on OPEN (this modal is mounted only
  // while open), which is exactly why the read is `.state`-gated and never
  // `resource()` or `.latest` alone: it settles while the dialog is already
  // open, and a suspending read would remount this section — detaching the open
  // <dialog>, losing its modal backdrop and any typed input
  // (kdd/solid-reactivity-pitfalls § no remounts on interaction).
  const [assignedData] = createResource(
    () => site()?.id,
    async siteId => {
      const result = await graphqlFetch(StoresBySite, { siteId });
      if (result.kind !== 'success') return undefined;
      return result.data.stores.nodes;
    }
  );
  const assigned = (): SiteStore[] =>
    assignedData.state === 'ready' || assignedData.state === 'refreshing'
      ? (assignedData.latest ?? [])
      : [];

  // The store draft is held as its two DELTAS over the fetched set rather than
  // as a copied list, so it needs no seeding effect and cannot go stale when
  // the fetch settles (kdd/solid-reactivity-pitfalls: derive, don't mirror).
  const [removedIds, setRemovedIds] = createSignal<string[]>([]);
  const [addedStores, setAddedStores] = createSignal<SiteStore[]>([]);
  const draftStores = (): SiteStore[] => [
    ...assigned().filter(store => !removedIds().includes(store.id)),
    ...addedStores(),
  ];

  const canRemoveStores = () =>
    site() === undefined ||
    storeRemovalAllowed(site()?.id ?? 0, props.centralSiteId);

  const pairingSite = () => {
    const current = site();
    return current && showsPairingControls(current, props.ownSiteId)
      ? current
      : undefined;
  };

  // The deployment-gate table, transcribed from spec/sites/rules.md § where
  // sites are managed (siteGates.ts) — read once here so every affordance below
  // answers the same source, and so the table itself is unit-testable.
  const gates = () =>
    siteAffordances({
      isStandalone: props.isStandalone,
      isExistingSite: site() !== undefined,
      pairingAvailable: pairingSite() !== undefined,
    });

  const rejectionMessage = (): string | undefined => {
    const current = rejection();
    if (!current) return undefined;
    if (current.kind === 'fieldRequired') {
      // The field is named in the message (ui-surface S3).
      const field =
        current.field === 'code'
          ? t('label.code')
          : current.field === 'name'
            ? t('label.name')
            : t('label.settings-password');
      return t('error.field-must-be-specified', { field });
    }
    return t('error.unable-to-save-site');
  };

  const save = async () => {
    const mode = isEdit ? 'edit' : 'create';
    if (saving() || !isFormValid(form(), mode)) return; // re-entry + Save gate
    setSaving(true);
    setRejection(undefined);

    const current = site();
    // A create PROPOSES the id from the loaded page; an edit keeps the site's
    // own (which is never shown and never editable — OMS-FUN-SYC-002.23).
    const siteId = current?.id ?? proposedSiteId(props.loadedSites());
    const change = storeDraftChange(assigned(), draftStores());

    const outcome = await runSiteSave({
      // The site's own fields first.
      site: async () => {
        const result = await graphqlFetch(UpsertSite, {
          input: buildUpsertInput(form(), siteId),
        });
        // A non-success is the deployment gate or a transport failure — both
        // already surfaced globally (ui-surface S3 § deployment-gate refusals);
        // stay open so nothing typed is lost.
        if (result.kind !== 'success')
          return { kind: 'other', description: '' };
        const response = result.data.centralServer.site.upsertSite;
        if (response.__typename === 'UpsertSiteError')
          return upsertRejection(response.error);
        setSite(response);
        return undefined;
      },
      // Then the assignments — additions, then removals-as-reassignments. Empty
      // when the draft is untouched, so no assignment call is made at all
      // (OMS-FUN-SYC-002.3).
      stores: [
        ...(change.added.length > 0
          ? [() => assignStores(siteId, change.added)]
          : []),
        ...(change.removed.length > 0 && canRemoveStores()
          ? [() => assignStores(props.centralSiteId, change.removed)]
          : []),
      ],
    });

    setSaving(false);
    if (outcome.kind === 'saved') {
      // Success closes the dialog; the register re-reads behind it (D21 —
      // closure and the updated list ARE the confirmation).
      props.onChanged();
      props.onClose();
      return;
    }
    // Rejected. `storesRejected` means the site's FIELD changes are already
    // committed and stay that way (OMS-FUN-SYC-002.36), so the register is
    // re-read even though the editor stays open.
    if (outcome.kind === 'storesRejected') props.onChanged();
    setRejection(outcome.rejection);
  };

  // One assignment call. `assignStoresToSite` carries NO error type, so its
  // rejections (a store that does not exist, naming the missing ones) are
  // top-level errors — taken back here rather than thrown at the global modal,
  // so the editor can say what happened with its field changes already
  // committed.
  const assignStores = async (
    siteId: number,
    storeIds: string[]
  ): Promise<SaveRejection | undefined> => {
    const result = await graphqlFetch(
      AssignStoresToSite,
      { input: { siteId, storeIds } },
      { returnGraphqlErrors: true }
    );
    if (result.kind === 'success') return undefined;
    return {
      kind: 'other',
      description: result.kind === 'graphqlError' ? result.message : '',
    };
  };

  return (
    <Dialog
      open
      initialFocus={codeField}
      testId="site-edit-modal"
      width="form"
      title={isEdit ? t('title.edit-site') : t('title.create-site')}
      icon={isEdit ? undefined : <PlusCircleIcon />}
      // Blocking while a write is in flight. ⚠️ ui-surface asks for a dialog
      // non-dismissable by BACKDROP click; the library's Dialog has one flag
      // for the scrim and Escape together, and swallowing Escape would break
      // the accessibility baseline, so dismissal follows the peer verticals.
      // Flagged in BUILD_REPORT as a candidate library refinement.
      dismissable={!saving()}
      onClose={props.onClose}
      footer={
        <Show when={rejectionMessage()}>
          {message => (
            <Alert severity="error" testId="site-save-error">
              {message()}
              {/* The store step's own message, when it had one — the raw detail
                  one click away rather than in the sentence (registry role
                  "Error detail disclosure"). */}
              <Show when={detailOf(rejection())}>
                {detail => <ErrorDetails detail={detail()} />}
              </Show>
            </Alert>
          )}
        </Show>
      }
      // Delete on the inline start, the right-aligned pair after it. A
      // read-only editor shows Cancel ALONE (ui-surface S2 § layout).
      actionsLead={
        <Show when={gates().delete ? site() : undefined}>
          {existing => (
            <DeleteSiteAction
              site={existing()}
              assignedStoreCount={draftStores().length}
              disabled={saving()}
              onDeleted={() => {
                props.onChanged();
                props.onClose();
              }}
            />
          )}
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
          <Show when={gates().save}>
            <DialogSaveButton
              data-testid="dialog-button-ok"
              loading={saving()}
              disabled={!isFormValid(form(), isEdit ? 'edit' : 'create')}
              onClick={() => void save()}
            />
          </Show>
        </>
      }
    >
      {/* The field rows as ONE vertical stack, in the spec's order (ui-surface S2
          § layout). Each row is a labelled field row, so its control hides its
          own label and keeps an accessible name.
          ⚠️ The spec's "detail container" for the body is expressed as the
          dialog's own `width="form"` measure, NOT a DetailContainer inside it:
          the Dialog's contract forbids narrowing a measure-sized dialog by
          capping its CONTENT (the frame, title row and actions row would stay
          wide around a floating body). Same width cap, the right owner. */}
      <Stack>
        <FieldRow label={t('label.code')} required={!isEdit}>
          <TextField
            ref={codeField.ref}
            hideLabel
            label={t('label.code')}
            width="full"
            data-testid="site-code-input"
            // Read-only mode renders the identity inputs disabled-with-value,
            // so the site's code and name stay readable (ui-surface §
            // cross-cutting).
            disabled={!gates().identityEditable || saving()}
            value={form().code}
            onInput={e => setForm({ ...form(), code: e.currentTarget.value })}
            // Trimmed on leaving the field, so a trailing space never reaches
            // validation (ui-surface S2).
            onBlur={e =>
              setForm({ ...form(), code: e.currentTarget.value.trim() })
            }
          />
        </FieldRow>
        <FieldRow label={t('label.name')} required>
          <TextField
            hideLabel
            label={t('label.name')}
            width="full"
            data-testid="site-name-input"
            disabled={!gates().identityEditable || saving()}
            value={form().name}
            onInput={e => setForm({ ...form(), name: e.currentTarget.value })}
            onBlur={e =>
              setForm({ ...form(), name: e.currentTarget.value.trim() })
            }
          />
        </FieldRow>
        {/* Standalone only — ABSENT otherwise, not disabled. Always empty on
            open: the stored credential is unreadable, and there is no password
            field on SiteNode at all (OMS-FUN-SYC-002.21). On an existing site the
            placeholder says "already set, leave blank to keep". */}
        <Show when={gates().password}>
          <FieldRow label={t('label.settings-password')} required={!isEdit}>
            <PasswordField
              hideLabel
              label={t('label.settings-password')}
              width="full"
              data-testid="site-password-input"
              placeholder={isEdit ? '••••••••' : undefined}
              disabled={saving()}
              value={form().password}
              onInput={e =>
                setForm({ ...form(), password: e.currentTarget.value })
              }
            />
          </FieldRow>
        </Show>
        {/* Existing sites only: everything below is written by sync, and a create
            has none of it yet. */}
        <Show when={site()}>
          {existing => (
            <>
              <FieldRow label={t('label.sync-version')}>
                <TextField
                  hideLabel
                  readonly
                  label={t('label.sync-version')}
                  width="full"
                  data-testid="site-sync-version"
                  // The RAW marker (V5V6 / V7), not a translated phrase.
                  value={existing().syncVersion}
                />
              </FieldRow>
              <FieldRow label={t('label.hardware-id')}>
                {/* The paired device's fingerprint, read-only, with the clear
                    action at the END of the row — offered only for a
                    current-flow site that is not this server's own AND that
                    actually has one to release. The generic horizontal stack is
                    the registry's own answer for a "value + affordance" row (a
                    hand-rolled flex row here would be a bespoke look-alike). */}
                <HStack>
                  <TextField
                    hideLabel
                    readonly
                    label={t('label.hardware-id')}
                    width="full"
                    data-testid="site-hardware-id"
                    value={existing().hardwareId ?? ''}
                  />
                  <Show
                    when={showsClearHardwareId(existing(), props.ownSiteId)}
                  >
                    <ClearHardwareIdAction
                      siteId={existing().id}
                      onCleared={() => {
                        setSite({ ...existing(), hardwareId: null });
                        props.onChanged();
                      }}
                    />
                  </Show>
                </HStack>
              </FieldRow>
              <Show when={pairingSite()}>
                {paired => (
                  <>
                    {/* The clear-token button IS the whole content of its row,
                        labelled with the same key. */}
                    <FieldRow label={t('label.clear-sync-token')}>
                      <ClearSyncTokenAction
                        siteId={paired().id}
                        onCleared={props.onChanged}
                      />
                    </FieldRow>
                    <FieldRow label={t('label.multi-device')}>
                      <MultiDeviceSwitch
                        siteId={paired().id}
                        isMultiDevice={paired().isMultiDevice}
                        flagEnabled={multiDeviceFlagEnabled(props.featureFlags)}
                        onSet={() => {
                          setSite({ ...paired(), isMultiDevice: true });
                          props.onChanged();
                        }}
                      />
                    </FieldRow>
                  </>
                )}
              </Show>
            </>
          )}
        </Show>
      </Stack>
      <SiteStoresSection
        stores={draftStores}
        showPicker={gates().storePicker}
        showRemove={gates().storeRemove}
        canRemove={canRemoveStores()}
        disabled={saving()}
        onAdd={store =>
          setAddedStores(current =>
            current.some(existing => existing.id === store.id)
              ? current
              : [...current, store]
          )
        }
        onRemove={store => {
          // A store the draft ADDED just leaves the draft; one the site already
          // has is marked for reassignment to the central server's site.
          if (addedStores().some(added => added.id === store.id)) {
            setAddedStores(current =>
              current.filter(added => added.id !== store.id)
            );
            return;
          }
          setRemovedIds(current =>
            current.includes(store.id) ? current : [...current, store.id]
          );
        }}
      />
    </Dialog>
  );
};

/** The raw server message behind a non-field rejection, when it carried one. */
const detailOf = (rejection: SaveRejection | undefined): string | undefined =>
  rejection?.kind === 'other' && rejection.description !== ''
    ? rejection.description
    : undefined;
