import React from 'react';

import {
  DialogButton,
  InputWithLabelRow,
  NumericTextInput,
  Box,
  useTranslation,
  useDialog,
  useKeyboardHeightAdjustment,
  QueryParamsProvider,
  createQueryParamsStore,
  useNotification,
  Typography,
} from '@openmsupply-client/common';
import {
  BundledItemFragment,
  DraftBundle,
  ItemVariantFragment,
  useUpsertBundledItem,
} from '../../../api';
import {
  ItemVariantSearchInput,
  StockItemSearchInput,
} from '@openmsupply-client/system';

export const BundledItemModal = ({
  bundle,
  variant,
  onClose,
}: {
  bundle: BundledItemFragment | null;
  variant: ItemVariantFragment;
  onClose: () => void;
}) => {
  const t = useTranslation();
  const { Modal } = useDialog({ isOpen: true, onClose, disableBackdrop: true });
  const height = useKeyboardHeightAdjustment(350);
  const { success } = useNotification();

  const { draft, isComplete, updateDraft, save } = useUpsertBundledItem({
    bundle,
    principalVariant: variant,
  });

  return (
    <Modal
      title={t('title.bundle-with')}
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
      okButton={
        <DialogButton
          disabled={!isComplete}
          variant="ok"
          onClick={() => {
            save();
            success(t('messages.bundled-item-saved'))();
            onClose();
          }}
        />
      }
      height={height}
      width={700}
      slideAnimation={false}
    >
      <QueryParamsProvider
        createStore={createQueryParamsStore({ initialSortBy: { key: 'name' } })}
      >
        <BundledItemForm
          draft={draft}
          updateDraft={updateDraft}
          principalVariant={variant}
        />
      </QueryParamsProvider>
    </Modal>
  );
};

const BundledItemForm = ({
  draft,
  principalVariant,
  updateDraft,
}: {
  draft: DraftBundle;
  principalVariant: ItemVariantFragment;
  updateDraft: (update: Partial<DraftBundle>) => void;
}) => {
  const t = useTranslation();

  return (
    <Box justifyContent="center" display="flex" gap={3}>
      <Box display="flex" flexDirection="column" gap={1} flex={1}>
        <InputWithLabelRow
          label={t('label.item_one')}
          labelWidth="200"
          Input={
            <Box width="100%">
              <StockItemSearchInput
                autoFocus={!draft.itemId}
                openOnFocus={!draft.itemId}
                onChange={item => updateDraft({ itemId: item?.id })}
                currentItemId={draft.itemId}
                extraFilter={item => item.id !== principalVariant.itemId}
              />
            </Box>
          }
        />
        {draft.itemId && (
          <>
            <InputWithLabelRow
              label={t('label.variant')}
              labelWidth="200"
              Input={
                <Box width="100%">
                  <ItemVariantSearchInput
                    onChange={variantId => updateDraft({ variantId })}
                    itemId={draft.itemId}
                    selectedId={draft.variantId}
                    getOptionDisabled={variant =>
                      // Disable variants that already have variants bundled to them
                      variant.bundledItemVariants.length > 0 ||
                      // and variants that we have already bundled to this variant
                      principalVariant.bundledItemVariants.some(
                        v => v.bundledItemVariant?.id === variant.id
                      )
                    }
                  />
                </Box>
              }
            />

            <InputWithLabelRow
              label={t('label.ratio')}
              labelWidth="200"
              Input={
                <Box width="100%">
                  <NumericTextInput
                    decimalLimit={5}
                    value={draft.ratio}
                    onChange={ratio => {
                      updateDraft({ ratio });
                    }}
                    style={{ justifyContent: 'flex-start' }}
                  />
                  <Typography
                    variant="caption"
                    fontStyle="italic"
                    color="textSecondary"
                  >
                    {t('description.bundle-ratio')}
                  </Typography>
                </Box>
              }
            />
          </>
        )}
      </Box>
    </Box>
  );
};
