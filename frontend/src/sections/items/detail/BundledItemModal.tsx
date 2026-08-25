import { generateUUID } from '../../../uuid';
import { createResource, createSignal, Show, type Component } from 'solid-js';
import { graphqlFetch } from '../../../api/graphql';
import { gated } from '../../../api/gated';
import { t } from '../../../intl';
import { Dialog } from '../../../ui/elements/feedback/Dialog';
import { Alert } from '../../../ui/elements/feedback/Alert';
import {
  CancelButton,
  DialogSaveButton,
} from '../../../ui/elements/buttons/StandardButtons';
import { NumberField } from '../../../ui/elements/inputs/NumberField';
import { Combobox } from '../../../ui/elements/selectors/Combobox';
import { ItemSearch } from '../../../domain/item/ItemSearch';
import { createFocusTarget } from '../../../ui/utils/createFocusTarget';
import { ItemVariants } from './itemVariants.generated';
import { UpsertBundledItem } from './itemVariantMutations.generated';
import {
  buildUpsertInput,
  EMPTY_FORM,
  isFormValid,
  isVariantDisabled,
  type DraftBundledItem,
} from './bundledItemEdit';
import type { ItemVariantRow } from './itemVariantEdit';

// The S4 modal (spec/items/ui-surface.md § S4). Create-only — bundling
// another item's variant under this one; editing an existing bundle's ratio
// isn't part of ui-surface's scope (the "Bundle with" table only offers Add
// and per-row Delete). Mirrors AncillaryItemEditModal.tsx's shape, minus
// edit mode.

export interface BundledItemModalProps {
  storeId: string;
  /** The variant this bundle is created FROM (the principal). */
  principalVariantId: string;
  /**
   * The principal's own item — excluded from the item picker (no
   * self-bundling).
   */
  principalItemId: string;
  /**
   * This principal's existing bundledItemVariants' ids (duplicate-pair guard).
   */
  existingBundledVariantIds: string[];
  onClose: () => void;
  /** A save landed — the panel re-queries so the card reflects it. */
  onSaved: () => void;
}

export const BundledItemModal: Component<BundledItemModalProps> = props => {
  const [form, setForm] = createSignal<DraftBundledItem>(EMPTY_FORM);
  const [saving, setSaving] = createSignal(false);
  const [failed, setFailed] = createSignal(false);
  // Create-only, so the modal always opens with nothing picked and the flow
  // starts by typing an item (ui-surface S4).
  const itemSearch = createFocusTarget();

  // The chosen item's variants (step 2, shown once an item is picked) — the
  // same itemVariants query the panel itself uses, parametrised by whichever
  // item is picked here. Read WITHOUT suspending (this modal renders under an
  // already-open screen's Suspense — kdd/solid-reactivity-pitfalls § no
  // remounts).
  const [variantsData] = createResource(
    () =>
      form().itemId
        ? { storeId: props.storeId, itemId: form().itemId }
        : undefined,
    async v => {
      const result = await graphqlFetch(ItemVariants, v);
      if (result.kind !== 'success') return undefined;
      return result.data.items.nodes[0]?.variants ?? [];
    }
  );
  const candidateVariants = (): ItemVariantRow[] => gated(variantsData) ?? [];

  const selectedVariant = () =>
    candidateVariants().find(v => v.id === form().variantId);

  const save = async () => {
    if (saving() || !isFormValid(form())) return;
    setSaving(true);
    setFailed(false);

    const result = await graphqlFetch(UpsertBundledItem, {
      storeId: props.storeId,
      input: buildUpsertInput(form(), props.principalVariantId, generateUUID()),
    });
    if (result.kind !== 'success') {
      // Transport/unexpected/forbidden → the global modal already surfaced
      // it; stay open so entries aren't lost.
      setSaving(false);
      return;
    }

    const upserted = result.data.centralServer.bundledItem.upsertBundledItem;
    setSaving(false);
    // The error union is vestigial (contract.md) — every real rejection is
    // non-typed, so there's nothing to switch on: anything but the success
    // node is the one generic failure (ui-surface S4/S6).
    if (upserted.__typename !== 'BundledItemNode') {
      setFailed(true);
      return;
    }

    props.onSaved();
    props.onClose(); // success closes the dialog — closure IS the confirmation (D21)
  };

  return (
    <Dialog
      open
      testId="bundled-item-modal"
      initialFocus={itemSearch}
      title={t('title.bundle-with')}
      dismissable={!saving()}
      onClose={props.onClose}
      // Room for the item search's open listbox inside the dialog (#1029) —
      // it opens with the dialog (initialFocus) and is the bottom-most field:
      // header + field + the listbox's 18rem cap + padding.
      minBodyHeightRem={27}
      footer={
        <Show when={failed()}>
          <Alert severity="error" testId="bundled-item-save-error">
            {t('error.failed-to-save-bundled-item')}
          </Alert>
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
      {/* Item — the item catalogue lookup, excluding this variant's own item
          (no self-bundling, rules.md § bundled variants). */}
      <ItemSearch
        label={t('label.item_one')}
        storeId={props.storeId}
        focusTarget={itemSearch}
        excludeItemIds={[props.principalItemId]}
        value={form().itemId || undefined}
        disabled={saving()}
        onSelect={item =>
          setForm({
            itemId: item?.id ?? '',
            variantId: '',
            ratio: form().ratio,
          })
        }
      />
      {/* Variant + ratio appear once an item is chosen (ui-surface S4). */}
      <Show when={form().itemId}>
        <Combobox<ItemVariantRow>
          label={t('label.variant')}
          items={candidateVariants()}
          loading={variantsData.loading}
          disabled={saving()}
          itemToString={variant => variant.name}
          itemToValue={variant => variant.id}
          itemDisabled={variant =>
            isVariantDisabled(variant, props.existingBundledVariantIds)
          }
          value={form().variantId || undefined}
          selectedItem={selectedVariant()}
          onChange={variant =>
            setForm({ ...form(), variantId: variant?.id ?? '' })
          }
        />
        <NumberField
          label={t('label.ratio')}
          min={0}
          decimalLimit={4}
          disabled={saving()}
          helperText={t('description.bundle-ratio')}
          value={form().ratio}
          onChange={ratio => setForm({ ...form(), ratio: ratio ?? 0 })}
        />
      </Show>
    </Dialog>
  );
};
