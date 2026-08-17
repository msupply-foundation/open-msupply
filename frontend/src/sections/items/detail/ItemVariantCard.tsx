import { createSignal, For, Show, type Component } from 'solid-js';
import { graphqlFetch } from '../../../api/graphql';
import { t } from '../../../intl';
import { DetailCard } from '../../../ui/layout/Detail/DetailCard';
import { FormRow } from '../../../ui/layout/Form/FormRow';
import { FormSection } from '../../../ui/layout/Form/FormSection';
import { LabelledValue } from '../../../ui/elements/typography/LabelledValue';
import { RecordLink } from '../../../ui/elements/typography/RecordLink';
import { Text } from '../../../ui/elements/typography/Text';
import { Table } from '../../../ui/elements/table/Table';
import { EmptyState } from '../../../ui/elements/feedback/EmptyState';
import { Alert } from '../../../ui/elements/feedback/Alert';
import { Button } from '../../../ui/elements/buttons/Button';
import { IconButton } from '../../../ui/elements/buttons/IconButton';
import { ConfirmDialog } from '../../../ui/elements/feedback/ConfirmDialog';
import { EditIcon, PlusCircleIcon, TrashIcon } from '../../../ui/icons';
import {
  DeleteBundledItem,
  DeleteItemVariant,
} from './itemVariantMutations.generated';
import { formatRatio, invertRatio } from './bundledItemEdit';
import type { ItemVariantRow } from './itemVariantEdit';
import { BundledItemModal } from './BundledItemModal';

// One variant, as a card (spec/items S2 › Variants tab). Built on the new
// DetailCard: header = name + Edit/Delete; body = the read-only field set (the
// same fields as S3, minus Name which is the heading), a read-only packaging
// table, and the two-sided Bundling section. Self-contained: owns its own
// delete/bundle-add/bundle-delete confirm state locally (explicit composition
// over indirection) and reports upward only via `onEdit`/`onChanged` — the
// panel supplies the query and refetches after any change here.

export interface ItemVariantCardProps {
  storeId: string;
  variant: ItemVariantRow;
  isVaccine: boolean;
  onEdit: () => void;
  /**
   * A change landed (delete / bundle add / bundle delete) — refetch the list.
   */
  onChanged: () => void;
}

export const ItemVariantCard: Component<ItemVariantCardProps> = props => {
  const [pendingDelete, setPendingDelete] = createSignal(false);
  const [deleteFailed, setDeleteFailed] = createSignal(false);
  const [bundleModalOpen, setBundleModalOpen] = createSignal(false);
  const [pendingBundleDeleteId, setPendingBundleDeleteId] =
    createSignal<string>();
  const [bundleDeleteFailed, setBundleDeleteFailed] = createSignal(false);

  // A variant can be a principal (bundling others in) XOR a bundled child
  // (bundled onto another) — never both (rules.md § bundled variants, no
  // nesting). While it's a bundled child, "Add bundled item" withholds itself
  // (ui-surface S2 › Variants tab, AC-B4).
  const isBundledOnOthers = () => props.variant.bundlesWith.length > 0;

  const confirmDeleteVariant = async () => {
    setDeleteFailed(false);
    const result = await graphqlFetch(
      DeleteItemVariant,
      { storeId: props.storeId, input: { id: props.variant.id } },
      { returnGraphqlErrors: true }
    );
    if (result.kind === 'success') {
      props.onChanged();
    } else {
      setDeleteFailed(true);
    }
  };

  const confirmDeleteBundle = async () => {
    const bundleId = pendingBundleDeleteId();
    if (!bundleId) return;
    setBundleDeleteFailed(false);
    const result = await graphqlFetch(
      DeleteBundledItem,
      { storeId: props.storeId, input: { id: bundleId } },
      { returnGraphqlErrors: true }
    );
    if (result.kind === 'success') {
      props.onChanged();
    } else {
      setBundleDeleteFailed(true);
    }
  };

  return (
    <>
      <DetailCard
        title={props.variant.name}
        actions={
          <>
            <IconButton
              icon={<EditIcon />}
              label={t('label.edit')}
              onClick={props.onEdit}
            />
            <IconButton
              icon={<TrashIcon />}
              label={t('label.delete')}
              variant="danger"
              onClick={() => setPendingDelete(true)}
            />
          </>
        }
      >
        <Show when={deleteFailed()}>
          <Alert severity="error">
            {t('error.failed-to-delete-item-variant')}
          </Alert>
        </Show>

        <FormRow>
          <LabelledValue label={t('label.location-type')}>
            {props.variant.locationType?.name ?? ''}
          </LabelledValue>
          <LabelledValue label={t('label.manufacturer')}>
            {props.variant.manufacturer?.name ?? ''}
          </LabelledValue>
          <Show when={props.isVaccine}>
            <LabelledValue label={t('label.vvm-type')}>
              {props.variant.vvmType ?? ''}
            </LabelledValue>
          </Show>
        </FormRow>

        {/* headingLevel h3 on all three: the card's own title is the h2, so
            these are its SUB-groups — size never dictates rank (WCAG 2.2). */}
        <FormSection title={t('title.packaging')} headingLevel="h3">
          <Table label={t('title.packaging')}>
            <thead>
              <tr>
                <th>{t('label.level')}</th>
                <th>{t('label.name')}</th>
                <th data-numeric>{t('label.pack-size')}</th>
                <th data-numeric>{t('label.volume-per-unit')}</th>
              </tr>
            </thead>
            <tbody>
              <For each={props.variant.packagingVariants}>
                {row => (
                  <tr>
                    <td>{row.packagingLevel}</td>
                    <td>{row.name}</td>
                    <td data-numeric>{row.packSize}</td>
                    <td data-numeric>{row.volumePerUnit}</td>
                  </tr>
                )}
              </For>
            </tbody>
          </Table>
        </FormSection>

        <FormSection title={t('title.bundle-with')} headingLevel="h3">
          <Show
            when={props.variant.bundledItemVariants.length > 0}
            fallback={
              <EmptyState
                graphic={false}
                message={t('messages.no-bundled-items')}
              />
            }
          >
            <Table label={t('title.bundle-with')}>
              <thead>
                <tr>
                  <th>{t('label.item-variant')}</th>
                  <th data-numeric title={t('description.bundle-ratio')}>
                    {t('label.ratio')}
                  </th>
                  <th data-check aria-label={t('label.delete')} />
                </tr>
              </thead>
              <tbody>
                <For each={props.variant.bundledItemVariants}>
                  {bundle => (
                    <tr>
                      <td>
                        {bundle.bundledItemVariant
                          ? `${bundle.bundledItemVariant.itemName} - ${bundle.bundledItemVariant.name}`
                          : ''}
                      </td>
                      <td data-numeric>{formatRatio(bundle.ratio)}</td>
                      <td data-check>
                        <IconButton
                          icon={<TrashIcon />}
                          label={t('label.delete')}
                          variant="danger"
                          onClick={() => setPendingBundleDeleteId(bundle.id)}
                        />
                      </td>
                    </tr>
                  )}
                </For>
              </tbody>
            </Table>
          </Show>
          <Show when={bundleDeleteFailed()}>
            <Alert severity="error">
              {t('error.failed-to-delete-bundled-item')}
            </Alert>
          </Show>
          <Button
            icon={<PlusCircleIcon />}
            disabled={isBundledOnOthers()}
            onClick={() => setBundleModalOpen(true)}
          >
            {t('label.add-bundled-item')}
          </Button>
          {/* Why Add is disabled (ui-surface S2, AC-B4) — the caption the
              reference app shows beside the withheld action. */}
          <Show when={isBundledOnOthers()}>
            <Text variant="bodySmall">{t('messages.cannot-bundle')}</Text>
          </Show>
        </FormSection>

        <FormSection title={t('title.bundled-on')} headingLevel="h3">
          <Show
            when={props.variant.bundlesWith.length > 0}
            fallback={
              <EmptyState
                graphic={false}
                message={t('messages.no-bundled-items')}
              />
            }
          >
            <Table label={t('title.bundled-on')}>
              <thead>
                <tr>
                  <th>{t('label.item-variant')}</th>
                  <th data-numeric title={t('description.bundled-item-ratio')}>
                    {t('label.ratio')}
                  </th>
                </tr>
              </thead>
              <tbody>
                <For each={props.variant.bundlesWith}>
                  {bundle => (
                    <tr>
                      <td>
                        <Show when={bundle.principalItemVariant}>
                          {principal => (
                            <>
                              {/* A link to a RELATED RECORD, so the shared
                                  RecordLink — not a hand-rolled <A> (a bespoke
                                  look-alike, C3). No `kind`: item is not one of
                                  the brand-toned kinds, so this is the neutral
                                  reference. */}
                              <RecordLink
                                href={`/${props.storeId}/catalogue/items/${principal().itemId}?tab=variants`}
                              >
                                {principal().itemName}
                              </RecordLink>
                              {' - '}
                              {principal().name}
                            </>
                          )}
                        </Show>
                      </td>
                      <td data-numeric>{invertRatio(bundle.ratio)}</td>
                    </tr>
                  )}
                </For>
              </tbody>
            </Table>
          </Show>
        </FormSection>
      </DetailCard>

      <Show when={pendingDelete()}>
        <ConfirmDialog
          open
          title={t('heading.are-you-sure')}
          message={t('messages.confirm-delete-item-variant')}
          confirmLabel={t('button.delete')}
          confirmVariant="danger"
          onConfirm={() => void confirmDeleteVariant()}
          onClose={() => setPendingDelete(false)}
        />
      </Show>

      <Show when={pendingBundleDeleteId()}>
        <ConfirmDialog
          open
          title={t('heading.are-you-sure')}
          message={t('messages.confirm-delete-bundled-item')}
          confirmLabel={t('button.delete')}
          confirmVariant="danger"
          onConfirm={() => void confirmDeleteBundle()}
          onClose={() => setPendingBundleDeleteId(undefined)}
        />
      </Show>

      <Show when={bundleModalOpen()}>
        <BundledItemModal
          storeId={props.storeId}
          principalVariantId={props.variant.id}
          principalItemId={props.variant.itemId}
          existingBundledVariantIds={props.variant.bundledItemVariants.map(
            b => b.bundledItemVariantId
          )}
          onClose={() => setBundleModalOpen(false)}
          onSaved={() => {
            setBundleModalOpen(false);
            props.onChanged();
          }}
        />
      </Show>
    </>
  );
};
