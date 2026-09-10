import { createResource, createSignal, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { graphqlFetch } from '@/api/graphql';
import { gated } from '@/api/gated';
import { t } from '@/intl';
import { generateUUID } from '@/uuid';
import { Dialog } from '@/ui/elements/feedback/Dialog';
import { CancelButton, OkButton } from '@/ui/elements/buttons/StandardButtons';
import { Alert } from '@/ui/elements/feedback/Alert';
import { createFocusTarget } from '@/ui/utils/createFocusTarget';
import { FieldRow } from '@/ui/elements/inputs/FieldRow';
import { TextField } from '@/ui/elements/inputs/TextField';
import { TextArea } from '@/ui/elements/inputs/TextArea';
import { ToggleSwitch } from '@/ui/elements/inputs/ToggleSwitch';
import { Select } from '@/ui/elements/selectors/Select';
import { AsyncCombobox } from '@/ui/elements/selectors/AsyncCombobox';
import { StoreSearch, type StoreOption } from '@/domain/store';
import { CCE_CLASS_ID } from '../equipment';
import { InsertAsset, InsertAssetLog } from '../equipment.generated';
import {
  AssetCatalogueItemsList,
  AssetCategoriesList,
  AssetTypesList,
  type AssetCatalogueItemsListResult,
} from '../catalogue.generated';
import {
  buildCreatedLogInput,
  buildInsertInput,
  canCreate,
  emptyCreateForm,
  isTypeChoosable,
  withCatalogueMode,
  withCategory,
  type CreateAssetForm,
} from './createAsset';

// S3 — the New CCE modal (spec/cold-chain-equipment, ui-surface S3). The list
// mounts it fresh per open (a <Show> around it), so the form seeds once.
//
// TWO paths, one switch: with the catalogue, the user picks a catalogue item
// and the asset inherits the model's classification and specification; without
// it, they pick a category and a bare type (rules › where an asset comes from).

const PAGE_SIZE = 100;

type CatalogueItem =
  AssetCatalogueItemsListResult['assetCatalogueItems']['nodes'][number];

/** `<code> <type> <manufacturer> <model>` — the option's own composition. */
const catalogueItemLabel = (item: CatalogueItem): string =>
  [item.code, item.assetType?.name, item.manufacturer, item.model]
    .filter(Boolean)
    .join(' ');

export interface CreateAssetModalProps {
  storeId: string;
  /** Central + Manage only: which store will hold the asset (AC-S6). */
  showStorePicker: boolean;
  onClose: () => void;
  /** The asset was created — the list navigates to its detail screen. */
  onCreated: (assetId: string) => void;
}

export const CreateAssetModal: Component<CreateAssetModalProps> = props => {
  const [form, setForm] = createSignal<CreateAssetForm>(emptyCreateForm());
  const [saving, setSaving] = createSignal(false);
  // The one rejection this modal names: an asset number already in use. Every
  // other failure is untyped and reads as the generic message (AC-N1).
  const [errorKey, setErrorKey] = createSignal<
    'error.cce-asset-number-already-used' | 'error.unable-to-create-cce' | null
  >(null);

  // The async store picker holds the whole node — it has no local list to
  // resolve a bare id against.
  const [store, setStore] = createSignal<StoreOption | undefined>();

  const assetNumberField = createFocusTarget();

  // The cold-chain class's categories.
  const [categoryData] = createResource(async () => {
    const result = await graphqlFetch(AssetCategoriesList, {
      filter: { classId: { equalTo: CCE_CLASS_ID } },
    });
    return result.kind === 'success'
      ? result.data.assetCategories.nodes
      : undefined;
  });
  const categories = () => gated(categoryData) ?? [];

  // The chosen category's types — the bare-type path's second choice (AC-C3).
  const [typeData] = createResource(
    () => form().categoryId,
    async categoryId => {
      if (!categoryId) return [];
      const result = await graphqlFetch(AssetTypesList, {
        filter: { categoryId: { equalTo: categoryId } },
      });
      return result.kind === 'success' ? result.data.assetTypes.nodes : [];
    }
  );
  const types = () => gated(typeData) ?? [];

  // The catalogue-item picker: server-filtered and paged, because the catalogue
  // runs to hundreds of models. Narrowed by the chosen category where there is
  // one.
  const fetchCatalogueItems = async (search: string, offset: number) => {
    const result = await graphqlFetch(AssetCatalogueItemsList, {
      filter: {
        classId: { equalTo: CCE_CLASS_ID },
        ...(form().categoryId
          ? { categoryId: { equalTo: form().categoryId } }
          : {}),
        ...(search ? { search: { like: search } } : {}),
      },
      page: { first: PAGE_SIZE, offset },
    });
    if (result.kind !== 'success') return undefined;
    return {
      nodes: result.data.assetCatalogueItems.nodes,
      totalCount: result.data.assetCatalogueItems.totalCount,
    };
  };

  const save = async () => {
    if (saving() || !canCreate(form())) return; // re-entry guard + AC-N5
    setSaving(true);
    setErrorKey(null);
    const assetId = generateUUID();
    const inserted = await graphqlFetch(InsertAsset, {
      storeId: props.storeId,
      input: buildInsertInput(form(), assetId),
    });
    if (inserted.kind !== 'success') {
      setSaving(false);
      // Every declared error member is unreachable — the failure arrives as a
      // top-level GraphQL error (contract ⚠️ wire trap). The one case worth
      // naming is recognised by its message, exactly as the reference app does.
      setErrorKey(
        /AssetNumberAlreadyExists/.test(errorText(inserted))
          ? 'error.cce-asset-number-already-used'
          : 'error.unable-to-create-cce'
      );
      return;
    }
    // The opening status entry (AC-C5) — a SEPARATE call, not part of the
    // insert's transaction, so an insert that lands and a log that fails leaves
    // an asset with no status history (contract › where an asset comes from).
    // The asset exists either way, so the user is taken to it regardless.
    await graphqlFetch(InsertAssetLog, {
      storeId: props.storeId,
      input: buildCreatedLogInput(
        assetId,
        generateUUID(),
        t('message.asset-created')
      ),
    });
    setSaving(false);
    props.onCreated(assetId);
  };

  return (
    <Dialog
      open
      initialFocus={assetNumberField}
      testId="create-asset-modal"
      title={t('heading.new-cold-chain-equipment')}
      dismissable={!saving()}
      onClose={props.onClose}
      // Room for the catalogue picker's open listbox: it sits third from the
      // top with two rows below it.
      minBodyHeightRem={26}
      actions={
        <>
          <Show when={!saving()}>
            <CancelButton
              data-testid="dialog-button-cancel"
              onClick={props.onClose}
            />
          </Show>
          {/* Inert until an asset number is entered AND the asset is
              classified — an unclassified insert fails as an unexplained
              storage failure (AC-N5, AC-C7). */}
          <OkButton
            data-testid="dialog-button-ok"
            loading={saving()}
            disabled={!canCreate(form()) || saving()}
            onClick={() => void save()}
          />
        </>
      }
    >
      <Show when={errorKey()}>
        {key => <Alert severity="error">{t(key())}</Alert>}
      </Show>
      {/* The switch sits trailing on its own line, above the rows it governs
          (ui-surface S3 § layout). */}
      <ToggleSwitch
        label={t('label.use-catalogue')}
        testId="use-catalogue-toggle"
        disabled={saving()}
        checked={form().useCatalogue}
        onChange={useCatalogue =>
          setForm(withCatalogueMode(form(), useCatalogue))
        }
      />
      <Show when={props.showStorePicker}>
        <FieldRow label={t('label.store')}>
          <StoreSearch
            label={t('label.store')}
            inputTestId="store-input"
            disabled={saving()}
            selected={store()}
            onSelect={picked => {
              setStore(picked ?? undefined);
              setForm({ ...form(), storeId: picked?.id ?? '' });
            }}
          />
        </FieldRow>
      </Show>
      <FieldRow label={t('label.category')}>
        <Select
          label={t('label.category')}
          hideLabel
          clearable
          testId="category-select"
          disabled={saving()}
          value={form().categoryId}
          options={categories().map(category => ({
            value: category.id,
            label: category.name,
          }))}
          onValueChange={categoryId =>
            setForm(withCategory(form(), categoryId))
          }
          onClear={() => setForm(withCategory(form(), ''))}
        />
      </FieldRow>
      <Show
        when={form().useCatalogue}
        fallback={
          <FieldRow label={t('label.type')}>
            <Select
              label={t('label.type')}
              hideLabel
              testId="type-select"
              // Needs a category first (AC-C3).
              disabled={!isTypeChoosable(form()) || saving()}
              value={form().typeId}
              options={types().map(type => ({
                value: type.id,
                label: type.name,
              }))}
              onValueChange={typeId => setForm({ ...form(), typeId })}
            />
          </FieldRow>
        }
      >
        <FieldRow label={t('label.catalogue-item')}>
          <AsyncCombobox<CatalogueItem>
            label={t('label.catalogue-item')}
            hideLabel
            inputTestId="catalogue-item-input"
            disabled={saving()}
            fetchPage={fetchCatalogueItems}
            itemToString={catalogueItemLabel}
            itemToValue={item => item.id}
            value={form().catalogueItemId || undefined}
            onSelect={item =>
              setForm({ ...form(), catalogueItemId: item?.id ?? '' })
            }
          />
        </FieldRow>
      </Show>
      <FieldRow label={t('label.asset-number')} required>
        <TextField
          ref={assetNumberField.ref}
          data-testid="asset-number-input"
          label={t('label.asset-number')}
          hideLabel
          disabled={saving()}
          value={form().assetNumber}
          onInput={e =>
            setForm({ ...form(), assetNumber: e.currentTarget.value })
          }
        />
      </FieldRow>
      <FieldRow label={t('label.notes')} align="first-line">
        <TextArea
          data-testid="notes-input"
          label={t('label.notes')}
          hideLabel
          rows={2}
          disabled={saving()}
          value={form().notes}
          onInput={e => setForm({ ...form(), notes: e.currentTarget.value })}
        />
      </FieldRow>
    </Dialog>
  );
};

/** The raw text of a failed fetch, for the one message worth recognising. */
const errorText = (result: { kind: string; [key: string]: unknown }): string =>
  JSON.stringify(result);
