import { generateUUID } from '../../../uuid';
import {
  createEffect,
  createResource,
  createSignal,
  For,
  on,
  Show,
  type Component,
} from 'solid-js';
import { graphqlFetch } from '../../../api/graphql';
import { t } from '../../../intl';
import { Dialog } from '../../../ui/elements/feedback/Dialog';
import { createFocusTarget } from '../../../ui/utils/createFocusTarget';
import { Alert } from '../../../ui/elements/feedback/Alert';
import {
  CancelButton,
  DialogSaveButton,
} from '../../../ui/elements/buttons/StandardButtons';
import { TextField } from '../../../ui/elements/inputs/TextField';
import { NumberField } from '../../../ui/elements/inputs/NumberField';
import { Combobox } from '../../../ui/elements/selectors/Combobox';
import { FormColumns } from '../../../ui/layout/Form/FormColumns';
import { FormColumn } from '../../../ui/layout/Form/FormColumn';
import { FormSection } from '../../../ui/layout/Form/FormSection';
import { NameSearch } from '../../../domain/name/NameSearch';
import {
  fetchNameById,
  type NameOption,
} from '../../../domain/name/nameResource';
import { PlusCircleIcon } from '../../../ui/icons';
import {
  ItemVariantLocationTypes,
  type ItemVariantLocationTypesResult,
} from './itemVariants.generated';
import { UpsertItemVariant } from './itemVariantMutations.generated';
import {
  buildUpsertInput,
  emptyForm,
  formFromVariant,
  isFormValid,
  locationTypeLabel,
  rejectionMessage,
  saveRejection,
  type DraftItemVariant,
  type ItemVariantRow,
} from './itemVariantEdit';
import styles from './ItemVariantEditModal.module.css';

// The S3 create/edit modal (spec/items/ui-surface.md § S3). One surface for
// both modes; the panel mounts it fresh per open (props.editor snapshots the
// opening state), so the form seeds once — mirrors LocationEditModal.tsx /
// AncillaryItemEditModal.tsx (kdd/solid-reactivity-pitfalls § no remounts).
// Save only — ui-surface doesn't ask for a Save & Next here (unlike
// Ancillary's S5).

export type ItemVariantEditorState =
  { mode: 'create' } | { mode: 'edit'; variant: ItemVariantRow };

type LocationType =
  ItemVariantLocationTypesResult['locationTypes']['nodes'][number];

export interface ItemVariantEditModalProps {
  storeId: string;
  itemId: string;
  /** Gates the VVM type field (ui-surface S3 — vaccine items only). */
  isVaccine: boolean;
  editor: ItemVariantEditorState;
  onClose: () => void;
  /** A save landed — the panel re-queries so the cards reflect it. */
  onSaved: () => void;
}

export const ItemVariantEditModal: Component<
  ItemVariantEditModalProps
> = props => {
  const isEdit = () => props.editor.mode === 'edit';
  const editedVariant = (): ItemVariantRow | undefined =>
    props.editor.mode === 'edit' ? props.editor.variant : undefined;

  const [form, setForm] = createSignal<DraftItemVariant>(
    props.editor.mode === 'edit'
      ? formFromVariant(props.editor.variant)
      : emptyForm()
  );
  const [saving, setSaving] = createSignal(false);
  const [rejection, setRejection] = createSignal<string>();

  // The location-type picker's options — fetched once per store, read WITHOUT
  // suspending (this modal renders under an already-open screen's Suspense —
  // kdd/solid-reactivity-pitfalls § no remounts).
  const [typesData] = createResource(
    () => props.storeId,
    async storeId => {
      const result = await graphqlFetch(ItemVariantLocationTypes, { storeId });
      if (result.kind !== 'success') return undefined;
      return result.data.locationTypes.nodes;
    }
  );
  const locationTypes = (): LocationType[] =>
    typesData.state === 'ready' || typesData.state === 'refreshing'
      ? (typesData.latest ?? [])
      : [];

  // NameSearch's controlled value is the whole NameOption, not a bare id
  // (an async picker has no client-side list to resolve an id against) — so
  // the picked node is tracked directly, updated by onSelect. On edit it
  // seeds once from the by-id fetch below (the draft only carries the id;
  // NameSearch needs the full node to show a label before its own async page
  // loads — same "resolve before load" need as LocationEditModal's location
  // type, via the domain-level by-id fetch spec/reports' argument-form
  // restore already established); the `on` seed never re-fires once the
  // query key is set, so it can't clobber a later pick.
  const [manufacturer, setManufacturer] = createSignal<
    NameOption | undefined
  >();
  const [manufacturerData] = createResource(
    () => editedVariant()?.manufacturerId ?? undefined,
    async manufacturerId =>
      manufacturerId
        ? await fetchNameById(props.storeId, manufacturerId)
        : undefined
  );
  // Read WITHOUT suspending (this modal renders under an already-open
  // screen's Suspense — kdd/solid-reactivity-pitfalls § no remounts).
  createEffect(
    on(
      () =>
        manufacturerData.state === 'ready' ||
        manufacturerData.state === 'refreshing'
          ? manufacturerData.latest
          : undefined,
      resolved => {
        if (resolved) setManufacturer(resolved);
      }
    )
  );

  const save = async () => {
    if (saving() || !isFormValid(form())) return;
    setSaving(true);
    setRejection(undefined);

    const result = await graphqlFetch(UpsertItemVariant, {
      storeId: props.storeId,
      input: buildUpsertInput(
        form(),
        props.itemId,
        editedVariant()?.id ?? generateUUID()
      ),
    });
    if (result.kind !== 'success') {
      // Transport/unexpected/forbidden → the global modal already surfaced
      // it; stay open so entries aren't lost.
      setSaving(false);
      return;
    }

    const upserted = result.data.centralServer.itemVariant.upsertItemVariant;
    setSaving(false);
    if (upserted.__typename === 'UpsertItemVariantError') {
      setRejection(rejectionMessage(saveRejection(upserted.error)));
      return;
    }

    props.onSaved();
    props.onClose(); // success closes the dialog — closure IS the confirmation (D21)
  };

  const setPackaging = (
    id: string,
    patch: Partial<DraftItemVariant['packaging'][number]>
  ) =>
    setForm({
      ...form(),
      packaging: form().packaging.map(row =>
        row.id === id ? { ...row, ...patch } : row
      ),
    });

  // Name takes initial focus (spec/items S3 § variant details). Declared on the
  // Dialog: a field-level `autofocus` inside one never fires — the dialog panel
  // is the first autofocus candidate in tree order and always wins
  // (kdd/focus-targets).
  const nameField = createFocusTarget();

  return (
    <Dialog
      open
      initialFocus={nameField}
      testId="item-variant-edit-modal"
      title={isEdit() ? t('label.edit-variant') : t('label.add-variant')}
      icon={isEdit() ? undefined : <PlusCircleIcon />}
      widthRem={50}
      dismissable={!saving()}
      onClose={props.onClose}
      footer={
        <Show when={rejection()}>
          {message => (
            <Alert severity="error" testId="item-variant-save-error">
              {message()}
            </Alert>
          )}
        </Show>
      }
      // The standard, ICON-LESS dialog-footer buttons (ui-standards › controls
      // § dialogs, D55) — a footer is read as verbs in a fixed position, not a
      // toolbar, so it earns no icon. Each supplies its own translated label.
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
            disabled={!isFormValid(form()) || saving()}
            onClick={() => void save()}
          />
        </>
      }
    >
      <FormColumns>
        <FormColumn>
          <FormSection title={t('title.variant-details')}>
            <TextField
              ref={nameField.ref}
              data-testid="item-variant-name-input"
              label={t('label.name')}
              required
              disabled={saving()}
              value={form().name}
              onInput={e => setForm({ ...form(), name: e.currentTarget.value })}
            />
            <Combobox<LocationType>
              label={t('label.location-type')}
              items={locationTypes()}
              loading={typesData.loading}
              disabled={saving()}
              itemToString={locationTypeLabel}
              itemToValue={type => type.id}
              value={form().locationTypeId || undefined}
              selectedItem={editedVariant()?.locationType ?? undefined}
              onChange={type =>
                setForm({ ...form(), locationTypeId: type?.id ?? '' })
              }
            />
            <NameSearch
              label={t('label.manufacturer')}
              storeId={props.storeId}
              role="manufacturer"
              disabled={saving()}
              selected={manufacturer()}
              onSelect={name => {
                setManufacturer(name ?? undefined);
                setForm({ ...form(), manufacturerId: name?.id ?? '' });
              }}
            />
            <Show when={props.isVaccine}>
              <TextField
                label={t('label.vvm-type')}
                disabled={saving()}
                value={form().vvmType}
                onInput={e =>
                  setForm({ ...form(), vvmType: e.currentTarget.value })
                }
              />
            </Show>
          </FormSection>
        </FormColumn>
        <FormColumn>
          <FormSection title={t('title.packaging')}>
            <div class={styles.grid}>
              <span class={styles.columnHeader}>{t('label.level')}</span>
              <span class={styles.columnHeader}>{t('label.name')}</span>
              <span class={styles.columnHeader}>{t('label.pack-size')}</span>
              <span class={styles.columnHeader}>
                {t('label.volume-per-unit')}
              </span>
              <For each={form().packaging}>
                {row => (
                  <>
                    <span class={styles.level}>{row.packagingLevel}</span>
                    <TextField
                      label={t('label.name')}
                      hideLabel
                      disabled={saving()}
                      value={row.name}
                      onInput={e =>
                        setPackaging(row.id, { name: e.currentTarget.value })
                      }
                    />
                    <NumberField
                      label={t('label.pack-size')}
                      hideLabel
                      min={0}
                      decimalLimit={2}
                      disabled={saving()}
                      value={row.packSize}
                      onChange={packSize => setPackaging(row.id, { packSize })}
                    />
                    <NumberField
                      label={t('label.volume-per-unit')}
                      hideLabel
                      min={0}
                      decimalLimit={4}
                      disabled={saving()}
                      value={row.volumePerUnit}
                      onChange={volumePerUnit =>
                        setPackaging(row.id, { volumePerUnit })
                      }
                    />
                  </>
                )}
              </For>
            </div>
          </FormSection>
        </FormColumn>
      </FormColumns>
    </Dialog>
  );
};
