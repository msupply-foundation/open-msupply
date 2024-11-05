import React, { useState } from 'react';

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
import { BundledItemFragment, ItemVariantFragment } from '../../../api';
import {
  ItemVariantSearchInput,
  StockItemSearchInput,
} from '@openmsupply-client/system';

type DraftBundle = {
  itemId: string;
  variantId: string;
  ratio: number;
};

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

  const [draft, setDraft] = useState<DraftBundle>({
    itemId: bundle?.bundledItemVariant?.itemId ?? '',
    variantId: bundle?.bundledItemVariant?.id ?? '',
    ratio: bundle?.ratio ?? 1,
  });

  // const { draft, isComplete, updateDraft, updatePackagingVariant, save } =
  //   useItemVariant({
  //     variant: null,
  //   });

  return (
    <Modal
      title={t('title.bundled-with')}
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
      okButton={
        <DialogButton
          // disabled={!isComplete}
          variant="ok"
          onClick={() => {
            // save(draft);
            success(t('messages.item-variant-saved'))();
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
          updateDraft={(patch: Partial<DraftBundle>) =>
            setDraft({ ...draft, ...patch })
          }
          draft={draft}
        />
      </QueryParamsProvider>
    </Modal>
  );
};

const BundledItemForm = ({
  draft,
  updateDraft,
}: {
  draft: DraftBundle;
  updateDraft: (patch: Partial<DraftBundle>) => void;
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
                openOnFocus
                onChange={item => updateDraft({ itemId: item?.id })}
                currentItemId={draft.itemId}
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
                    onChange={variantId =>
                      updateDraft({
                        variantId: variantId ?? '',
                      })
                    }
                    itemId={draft.itemId}
                    selectedId={draft.variantId}
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
