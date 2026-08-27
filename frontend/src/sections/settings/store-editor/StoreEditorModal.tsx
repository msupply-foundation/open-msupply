import {
  createEffect,
  createResource,
  createSignal,
  For,
  on,
  Show,
} from 'solid-js';
import { graphqlFetch } from '../../../api/graphql';
import { gated } from '../../../api/gated';
import {
  hasPermission,
  refetchStoreContext,
} from '../../../store/storeContext';
import { isCentralServer } from '../../../api/serverInfo';
import { Dialog } from '../../../ui/elements/feedback/Dialog';
import {
  CancelButton,
  DialogSaveButton,
  SaveAndNextButton,
} from '../../../ui/elements/buttons/StandardButtons';
import { Alert } from '../../../ui/elements/feedback/Alert';
import { Text } from '../../../ui/elements/typography/Text';
import { Stack } from '../../../ui/layout/Stack/Stack';
import { Tabs, TabList, TabPanel } from '../../../ui/elements/tabs/Tabs';
import { t } from '../../../intl';
import { NameProperties } from '../configuration/nameProperties.generated';
import {
  StoreFacility,
  StorePreferences,
  UpdateNameProperties,
  UpsertStorePreferences,
} from './storeEditor.generated';
import { StoreGpsBlock } from './StoreGpsBlock';
import { StorePropertyField } from './StorePropertyField';
import { StorePreferencesPanel } from './StorePreferencesPanel';
import {
  buildPreferencesInput,
  canEditAnything,
  canEditPreferences,
  coordinate,
  isDefinitionEditable,
  LATITUDE_KEY,
  LONGITUDE_KEY,
  parseProperties,
  propertyFields,
  serialiseProperties,
  setProperty,
  type PreferenceDraft,
  type PropertyDraft,
} from './storeEditorLogic';

/*
 * S5 — the store editor (spec/settings/ui-surface.md § S5), opened from the
 * store-selection panel's Edit action, reachable on every screen, by every
 * signed-in user (OMS-REG-SET-05.17/.18): no permission gates OPENING it —
 * permissions govern what is editable inside.
 *
 * It has a SECOND caller: the central server's facility register (spec/names
 * § the facility editor), which opens it on any facility on the server rather
 * than the signed-in store, and adds one footer button — save-and-move-on. The
 * subject is already a prop (`nameId`), so the register needs nothing else from
 * this screen; `onSaveAndNext`/`hasNext` below are the whole of the addition.
 *
 * It edits the store's FACILITY record: name, code, GPS coordinates, and the
 * property values recorded against Configuration's seeded definitions. A save
 * replaces the facility's whole recorded set, so the complete document is sent
 * every time — a partial save silently erases what it omits (contract § The
 * store editor). A failed save surfaces inline and keeps the editor open with
 * the draft intact, and Save is disabled while the session can edit nothing
 * (D79).
 *
 * The Preferences tab lists the store's 23 operational preferences —
 * editable only on a central server with the central-data permission
 * (rules § The store editor › Preferences, OMS-REG-SET-05.33–.39). Its edits
 * stage per-preference (the write is per-preference, unlike the wholesale
 * properties document) and the one Save persists both tabs' staged edits.
 *
 * Reactivity: ALL THREE resources first fetch on an interaction — the footer click
 * that opens this dialog — under an already-open screen's Suspense boundary,
 * so each is read through the `.state` gate and never suspends. A suspending
 * read would remount the whole page inside that boundary, detaching the open
 * <dialog> (kdd/solid-reactivity-pitfalls § no remounts on interaction).
 */
export const StoreEditorModal = (props: {
  open: boolean;
  /**
   * The request's authorisation subject — the SIGNED-IN store, which decides
   * what the reads are allowed to see. Not necessarily the store being edited.
   */
  storeId: string;
  /** The store's FACILITY (name) id — the row this editor reads and writes. */
  nameId: string;
  /**
   * The store row behind `nameId` — the subject of the PREFERENCES tab, which
   * is per-store rather than per-name. On the footer path this is the same as
   * `storeId`; from the facility register it is the CHOSEN row's store, which
   * is why it is a separate, required prop rather than a default of `storeId`:
   * defaulting would silently rewrite the signed-in store's preferences while
   * showing another facility's name.
   */
  facilityStoreId: string;
  onClose: () => void;
  /*
   * The FACILITY REGISTER's extra footer action (spec/names § the facility
   * editor, `.31`): commit this facility's edits and re-open the editor on the
   * next row of the list as it currently stands, without closing. Absent on the
   * footer path, which has no list to walk — the button then isn't rendered at
   * all. The register resolves "next" from the page of rows it already holds
   * and calls back with nothing but "move on"; this editor owns only the save.
   */
  onSaveAndNext?: () => void;
  /**
   * Whether a next row exists. False on the last row of the loaded page, where
   * save-and-move-on is unavailable (`.32`).
   */
  hasNext?: boolean;
}) => {
  const [draft, setDraft] = createSignal<PropertyDraft>({});
  // Whether the user has actually edited a property this open — a prefs-only
  // save skips the wholesale properties write entirely.
  const [propertiesDirty, setPropertiesDirty] = createSignal(false);
  const [prefDraft, setPrefDraft] = createSignal<PreferenceDraft>({});
  const [saving, setSaving] = createSignal(false);
  const [saveFailed, setSaveFailed] = createSignal(false);

  // The facility record. Re-read on each open, so a reopen shows what the
  // server now holds (the saved values pre-fill — OMS-REG-SET-05.28).
  const [facilityData] = createResource(
    () =>
      props.open && props.nameId
        ? { storeId: props.storeId, nameId: props.nameId }
        : undefined,
    async ({ storeId, nameId }) => {
      const result = await graphqlFetch(
        StoreFacility,
        { storeId, nameId },
        { background: true }
      );
      return result.kind === 'success'
        ? result.data.names.nodes.find(node => node.id === nameId)
        : undefined;
    }
  );
  const facility = () => gated(facilityData);

  // The property-definition catalogue — the same query Configuration reads.
  const [definitionsData] = createResource(
    () => (props.open ? true : undefined),
    async () => {
      const result = await graphqlFetch(
        NameProperties,
        {},
        { background: true }
      );
      return result.kind === 'success' ? result.data.nameProperties.nodes : [];
    }
  );
  const definitions = () => gated(definitionsData) ?? [];

  // The store's 23 preference descriptions — served in display order, with a
  // fabricated default standing in for any unset preference (contract § The
  // store editor). Same interaction-opened read as the two above, so the same
  // non-suspending gate.
  const [preferencesData] = createResource(
    () =>
      props.open && props.facilityStoreId ? props.facilityStoreId : undefined,
    async storeId => {
      const result = await graphqlFetch(
        StorePreferences,
        { storeId },
        { background: true }
      );
      return result.kind === 'success'
        ? result.data.preferenceDescriptions
        : [];
    }
  );
  const preferences = () => gated(preferencesData) ?? [];

  // Seed the draft from the record each time one lands — the whole stored
  // document, including keys no definition covers, so the save can round-trip
  // them. A cancelled edit never leaks into the next open: reopening refetches
  // and re-seeds.
  createEffect(
    on(facility, record => {
      if (record) {
        setDraft(parseProperties(record.properties));
        setPropertiesDirty(false);
      }
    })
  );

  // Reopening starts clean of the previous attempt's failure and the previous
  // open's staged preference edits (the property draft re-seeds from the
  // refetched record above).
  createEffect(() => {
    if (props.open) {
      setSaveFailed(false);
      setPrefDraft({});
    }
  });

  const session = () => ({
    canMutate: hasPermission('NAME_PROPERTIES_MUTATE'),
    canEditCentralData: hasPermission('EDIT_CENTRAL_DATA'),
    isCentralServer: isCentralServer(),
  });
  const canEditProperties = () => canEditAnything(definitions(), session());
  const prefsEditable = () => canEditPreferences(session());
  // Save enablement additionally waits for the catalogue — a Save that could
  // only no-op stays disabled.
  const canEditPrefs = () => prefsEditable() && preferences().length > 0;
  const canEdit = () => canEditProperties() || canEditPrefs();

  const fields = () => propertyFields(definitions());

  const stage = (
    key: string,
    value: string | number | boolean | null | undefined
  ) => {
    setDraft(current => setProperty(current, key, value));
    setPropertiesDirty(true);
  };

  // `onDone` is what a successful save does next: close (the plain Save), or
  // move the register on to the next facility with the editor still open. A
  // FAILED save takes neither path — the modal stays open with the draft
  // intact and its own inline message (D79), whichever button was pressed.
  const save = async (onDone: () => void) => {
    setSaving(true);
    setSaveFailed(false);
    // Local error handling (returnGraphqlErrors): a Forbidden or any other
    // failure keeps the editor open with BOTH drafts intact and its own inline
    // message, rather than the global surfaces closing over it (D79).
    let failed = false;
    // The whole properties document — but only when the session can edit
    // properties (a preferences-only session firing it could only be refused)
    // AND a property was actually edited (a prefs-only save shouldn't re-write
    // an untouched document).
    if (canEditProperties() && propertiesDirty()) {
      const result = await graphqlFetch(
        UpdateNameProperties,
        {
          storeId: props.storeId,
          id: props.nameId,
          properties: serialiseProperties(draft()),
        },
        { background: true, returnGraphqlErrors: true }
      );
      failed = !(
        result.kind === 'success' &&
        result.data.updateNameProperties.__typename === 'NameNode'
      );
    }
    // The per-preference write — staged preferences only, each entry naming
    // the edited store (contract § The store editor, wire traps). Skipped
    // entirely when nothing is staged.
    const preferencesInput = canEditPrefs()
      ? buildPreferencesInput(prefDraft(), props.facilityStoreId)
      : undefined;
    if (!failed && preferencesInput) {
      const result = await graphqlFetch(
        UpsertStorePreferences,
        { storeId: props.facilityStoreId, input: preferencesInput },
        { background: true, returnGraphqlErrors: true }
      );
      failed = !(
        result.kind === 'success' &&
        result.data.centralServer.preferences.upsertPreferences.ok
      );
    }
    setSaving(false);
    if (failed) {
      setSaveFailed(true);
    } else {
      // A saved preference feeds live surfaces — the guard-3 gates and the
      // bottom bar's store colour — so refresh the global store context by
      // direct call (kdd/state-management: no cache keys). Fire-and-forget:
      // the editor's own job is done.
      //
      // Only when the edited store IS the entered one. From the facility
      // register the subject is some other store on the server: nothing live
      // changed, and refetching names a DIFFERENT store to the global context,
      // which is how a register save would silently re-point the whole app.
      if (preferencesInput && props.facilityStoreId === props.storeId)
        void refetchStoreContext(props.storeId);
      onDone();
    }
  };

  return (
    <Dialog
      open={props.open}
      onClose={props.onClose}
      // No title bar — the identity block leads the body (ui-surface § S5
      // layout). The store's name is the dialog's accessible name, carried as
      // `ariaLabel` rather than a hidden heading: the block below already
      // renders that name visibly, and a hidden twin of it is a duplicate text
      // node for no gain.
      title={<></>}
      ariaLabel={facility()?.name ?? t('label.edit-store-properties')}
      titleHidden
      // The form measure, not prose: the Preferences rows put a long label and
      // its control on ONE line (ui-surface § S5 layout), and the catalogue's
      // longest labels don't fit that beside a compact input at the prose
      // measure — they'd wrap the control onto its own line.
      width="form"
      testId="store-editor"
      dismissable={!saving()}
      actions={
        <>
          <CancelButton
            onClick={props.onClose}
            disabled={saving()}
            data-testid="dialog-button-cancel"
          />
          <DialogSaveButton
            loading={saving()}
            // Nothing editable → a Save that could only no-op or fail
            // (ui-standards › blocked affordances, D79).
            disabled={!canEdit()}
            onClick={() => void save(props.onClose)}
            data-testid="dialog-button-save"
          />
          {/* Register-only: beside Cancel and Save, never instead of them.
              Disabled on the last row of the loaded page (`.32`). */}
          <Show when={props.onSaveAndNext}>
            {onSaveAndNext => (
              <SaveAndNextButton
                loading={saving()}
                disabled={!canEdit() || props.hasNext !== true}
                onClick={() => void save(onSaveAndNext())}
                data-testid="dialog-button-save-and-next"
              />
            )}
          </Show>
        </>
      }
    >
      <Stack>
        {/* The identity block: the record's name as the form's heading, its
            code the muted line of secondary identity beneath — an identity
            header's shape, composed here rather than taken from IdentityHeader,
            whose <header> element would sit a SECOND banner landmark inside the
            dialog's own header row. The code's test id stays on the VALUE, the
            text the e2e contract reads from it. */}
        <Stack gap="sm">
          <Text variant="heading" level={2} data-testid="store-editor-name">
            {facility()?.name ?? ''}
          </Text>
          <Text variant="subtitle">
            {t('label.code')}:{' '}
            <span data-testid="store-editor-code">
              {facility()?.code ?? ''}
            </span>
          </Text>
        </Stack>
        <StoreGpsBlock
          latitude={coordinate(draft(), LATITUDE_KEY)}
          longitude={coordinate(draft(), LONGITUDE_KEY)}
          // GPS coordinates are property values, so they follow the
          // PROPERTIES editability — a preferences-only session must not
          // stage a position it can never save.
          disabled={!canEditProperties()}
          onCapture={(latitude, longitude) => {
            setDraft(current =>
              setProperty(
                setProperty(current, LATITUDE_KEY, latitude),
                LONGITUDE_KEY,
                longitude
              )
            );
            setPropertiesDirty(true);
          }}
        />

        <Tabs defaultValue="properties">
          <TabList
            tabs={[
              { value: 'properties', label: t('label.properties') },
              { value: 'preferences', label: t('label.preferences') },
            ]}
          />
          <TabPanel value="properties">
            <Show
              when={fields().length > 0}
              fallback={
                // "The server holds no definitions" (OMS-REG-SET-05.30) is a
                // claim about a landed catalogue — while the read is still in
                // flight the panel says nothing rather than flashing it.
                // `.loading` as a plain boolean is the sanctioned read; the
                // VALUES still come through the non-suspending `.state` gate.
                <Show when={!definitionsData.loading}>
                  <Text>{t('messages.no-properties')}</Text>
                </Show>
              }
            >
              {/* One column of full-width fields, on the form's own field
                  rhythm — the default Stack gap matches FormSection's. */}
              <Stack>
                <For each={fields()}>
                  {definition => (
                    <StorePropertyField
                      definition={definition}
                      value={draft()[definition.property.key]}
                      disabled={!isDefinitionEditable(definition, session())}
                      onChange={value => stage(definition.property.key, value)}
                    />
                  )}
                </For>
              </Stack>
            </Show>
          </TabPanel>
          <TabPanel value="preferences">
            <StorePreferencesPanel
              preferences={preferences()}
              draft={prefDraft()}
              disabled={!prefsEditable()}
              loading={preferencesData.loading}
              onStage={(key, value) =>
                setPrefDraft(current => ({ ...current, [key]: value }))
              }
            />
          </TabPanel>
        </Tabs>

        <Show when={saveFailed()}>
          <Alert severity="error" testId="store-editor-save-error">
            {t('error.problem-saving')}
          </Alert>
        </Show>
      </Stack>
    </Dialog>
  );
};
