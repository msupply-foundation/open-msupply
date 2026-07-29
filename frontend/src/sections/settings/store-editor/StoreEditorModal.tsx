import {
  createEffect,
  createResource,
  createSignal,
  For,
  on,
  Show,
} from 'solid-js';
import { graphqlFetch } from '../../../api/graphql';
import { hasPermission } from '../../../store/storeContext';
import { isCentralServer } from '../../../api/serverInfo';
import { Dialog } from '../../../ui/elements/feedback/Dialog';
import {
  CancelButton,
  DialogSaveButton,
} from '../../../ui/elements/buttons/StandardButtons';
import { Alert } from '../../../ui/elements/feedback/Alert';
import { Text } from '../../../ui/elements/typography/Text';
import { Stack } from '../../../ui/layout/Stack/Stack';
import { HStack } from '../../../ui/layout/Stack/HStack';
import { Tabs, TabList, TabPanel } from '../../../ui/elements/tabs/Tabs';
import { t } from '../../../intl';
import { NameProperties } from '../configuration/nameProperties.generated';
import { StoreFacility, UpdateNameProperties } from './storeEditor.generated';
import { StoreGpsBlock } from './StoreGpsBlock';
import { StorePropertyField } from './StorePropertyField';
import {
  canEditAnything,
  coordinate,
  isDefinitionEditable,
  LATITUDE_KEY,
  LONGITUDE_KEY,
  parseProperties,
  propertyFields,
  serialiseProperties,
  setProperty,
  type PropertyDraft,
} from './storeEditorLogic';

/*
 * S5 — the store editor (spec/settings/ui-surface.md § S5), opened from the
 * app footer's Edit cell on every screen, by every signed-in user
 * (OMS-REG-SET-05.17/.18): no permission gates OPENING it — permissions govern
 * what is editable inside.
 *
 * It edits the store's FACILITY record: name, code, GPS coordinates, and the
 * property values recorded against Configuration's seeded definitions. A save
 * replaces the facility's whole recorded set, so the complete document is sent
 * every time — a partial save silently erases what it omits (contract § The
 * store editor). A failed save surfaces inline and keeps the editor open with
 * the draft intact, and Save is disabled while the session can edit nothing
 * (D71).
 *
 * The Preferences tab is a known gap (spec/settings README § Status): the tab
 * group renders Properties alone until that capture pass lands.
 *
 * Reactivity: BOTH resources first fetch on an interaction — the footer click
 * that opens this dialog — under an already-open screen's Suspense boundary,
 * so each is read through the `.state` gate and never suspends. A suspending
 * read would remount the whole page inside that boundary, detaching the open
 * <dialog> (kdd/solid-reactivity-pitfalls § no remounts on interaction).
 */
export const StoreEditorModal = (props: {
  open: boolean;
  storeId: string;
  /** The store's FACILITY (name) id — the row this editor reads and writes. */
  nameId: string;
  onClose: () => void;
}) => {
  const [draft, setDraft] = createSignal<PropertyDraft>({});
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
  const facility = () =>
    facilityData.state === 'ready' || facilityData.state === 'refreshing'
      ? facilityData.latest
      : undefined;

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
  const definitions = () =>
    definitionsData.state === 'ready' || definitionsData.state === 'refreshing'
      ? (definitionsData.latest ?? [])
      : [];

  // Seed the draft from the record each time one lands — the whole stored
  // document, including keys no definition covers, so the save can round-trip
  // them. A cancelled edit never leaks into the next open: reopening refetches
  // and re-seeds.
  createEffect(
    on(facility, record => {
      if (record) setDraft(parseProperties(record.properties));
    })
  );

  // Reopening starts clean of the previous attempt's failure.
  createEffect(() => {
    if (props.open) setSaveFailed(false);
  });

  const session = () => ({
    canMutate: hasPermission('NAME_PROPERTIES_MUTATE'),
    isCentralServer: isCentralServer(),
  });
  const canEdit = () => canEditAnything(definitions(), session());

  const fields = () => propertyFields(definitions());

  const stage = (
    key: string,
    value: string | number | boolean | null | undefined
  ) => setDraft(current => setProperty(current, key, value));

  const save = async () => {
    setSaving(true);
    setSaveFailed(false);
    // Local error handling (returnGraphqlErrors): a Forbidden or any other
    // failure keeps the editor open with the draft intact and its own inline
    // message, rather than the global surfaces closing over it (D71).
    const result = await graphqlFetch(
      UpdateNameProperties,
      {
        storeId: props.storeId,
        id: props.nameId,
        properties: serialiseProperties(draft()),
      },
      { background: true, returnGraphqlErrors: true }
    );
    setSaving(false);
    if (
      result.kind === 'success' &&
      result.data.updateNameProperties.__typename === 'NameNode'
    ) {
      props.onClose();
    } else {
      setSaveFailed(true);
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
      widthRem={44}
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
            // (ui-standards › blocked affordances, D71).
            disabled={!canEdit()}
            onClick={() => void save()}
            data-testid="dialog-button-save"
          />
        </>
      }
    >
      <Stack>
        <Stack gap="sm">
          <Text variant="heading" level={2} data-testid="store-editor-name">
            {facility()?.name ?? ''}
          </Text>
          <HStack gap="sm">
            <Text variant="subtitle">{t('label.code')}:</Text>
            <Text data-testid="store-editor-code">
              {facility()?.code ?? ''}
            </Text>
          </HStack>
          <StoreGpsBlock
            latitude={coordinate(draft(), LATITUDE_KEY)}
            longitude={coordinate(draft(), LONGITUDE_KEY)}
            disabled={!canEdit()}
            onCapture={(latitude, longitude) =>
              setDraft(current =>
                setProperty(
                  setProperty(current, LATITUDE_KEY, latitude),
                  LONGITUDE_KEY,
                  longitude
                )
              )
            }
          />
        </Stack>

        {/* Properties alone for now — the Preferences tab is deferred to its
            own capture pass (spec/settings README § Status). */}
        <Tabs defaultValue="properties">
          <TabList
            tabs={[{ value: 'properties', label: t('label.properties') }]}
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
              <Stack gap="sm">
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
