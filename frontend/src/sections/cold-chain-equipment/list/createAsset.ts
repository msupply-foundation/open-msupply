import { CCE_CLASS_ID } from '../equipment';
import type {
  InsertAssetLogVariables,
  InsertAssetVariables,
} from '../equipment.generated';

// The create modal's form logic (spec/cold-chain-equipment › rules § where an
// asset comes from, ui-surface S3). Which of the two paths is in use, when the
// confirm becomes available, and the two inputs a create sends. Framework-free
// so each is testable in node vitest.

/**
 * The create draft. `useCatalogue` is the modal's switch: on, the user picks a
 * catalogue item and the asset inherits its class, category and type; off, they
 * pick a category and a type and the asset carries no catalogue item at all
 * (rules › where an asset comes from).
 */
export type CreateAssetForm = {
  useCatalogue: boolean;
  categoryId: string;
  catalogueItemId: string;
  typeId: string;
  assetNumber: string;
  notes: string;
  /** Central server, Manage › Equipment only — which store holds the asset. */
  storeId: string;
};

export const emptyCreateForm = (): CreateAssetForm => ({
  useCatalogue: true,
  categoryId: '',
  catalogueItemId: '',
  typeId: '',
  assetNumber: '',
  notes: '',
  storeId: '',
});

/**
 * Toggling the switch clears whichever of the two the user had chosen (OMS-REG-CCE-05.5).
 * The two paths answer "what machine is this" differently, so a choice made
 * under one is never a valid answer under the other.
 */
export const withCatalogueMode = (
  form: CreateAssetForm,
  useCatalogue: boolean
): CreateAssetForm => ({
  ...form,
  useCatalogue,
  catalogueItemId: '',
  typeId: '',
});

/**
 * Choosing a category clears the type beneath it: types belong to one category,
 * so one picked under the old category cannot stand under the new one. The
 * catalogue item goes too — the picker is narrowed by category.
 */
export const withCategory = (
  form: CreateAssetForm,
  categoryId: string
): CreateAssetForm => ({ ...form, categoryId, typeId: '', catalogueItemId: '' });

/**
 * Whether the create may be confirmed (OMS-REG-CCE-05.13).
 *
 * An asset number is required here — the frontend's own rule, not the server's,
 * which accepts an asset with none (rules › identity). And the asset MUST be
 * classified: without a catalogue item or a type, the insert fails as an
 * unexplained storage failure (OMS-REG-CCE-05.8, contract ⚠️ wire trap), so the modal
 * never lets one be submitted.
 */
export const canCreate = (form: CreateAssetForm): boolean => {
  if (!form.assetNumber.trim()) return false;
  return form.useCatalogue ? !!form.catalogueItemId : !!form.typeId;
};

/** Whether the type picker is live yet — it needs a category first (OMS-REG-CCE-05.4). */
export const isTypeChoosable = (form: CreateAssetForm): boolean =>
  !!form.categoryId;

/**
 * The draft as an insert input.
 *
 * `classId` is always sent: this register only creates cold-chain-equipment
 * assets, and an insert naming neither a catalogue item nor all three ids fails
 * as a foreign-key error rather than a stated one (contract ⚠️ wire trap).
 *
 * On the catalogue path the server OVERWRITES `categoryId`/`classId`/`typeId`
 * from the catalogue item, so what is sent for them there does not matter — the
 * category is sent anyway, because it is what the user chose and it is what
 * makes the insert valid if the catalogue item ever fails to resolve.
 *
 * `storeId` is omitted where the modal does not offer it; absent, the resolver
 * defaults it to the acting store, so an asset always belongs to one
 * (contract › where an asset comes from).
 */
export const buildInsertInput = (
  form: CreateAssetForm,
  id: string
): InsertAssetVariables['input'] => ({
  id,
  classId: CCE_CLASS_ID,
  categoryId: form.categoryId || null,
  assetNumber: form.assetNumber.trim(),
  notes: form.notes.trim() || null,
  ...(form.useCatalogue
    ? { catalogueItemId: form.catalogueItemId }
    : { typeId: form.typeId }),
  ...(form.storeId ? { storeId: form.storeId } : {}),
});

/**
 * The opening status entry every created asset gets (OMS-REG-CCE-05.6): a _Functioning_
 * entry commented _Asset created_, so a new machine reads as working rather
 * than as unknown.
 *
 * A separate call the CLIENT issues after the insert succeeds — it is not part
 * of the insert's transaction, so an insert that lands and a log that fails
 * leaves an asset with no status history (contract › where an asset comes
 * from).
 */
export const buildCreatedLogInput = (
  assetId: string,
  id: string,
  comment: string,
  status: NonNullable<InsertAssetLogVariables['input']['status']> = 'FUNCTIONING'
): InsertAssetLogVariables['input'] => ({
  id,
  assetId,
  status,
  comment,
});
