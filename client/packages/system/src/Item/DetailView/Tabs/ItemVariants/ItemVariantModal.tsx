import React from 'react';

import {
  BasicTextInput,
  DialogButton,
  InputWithLabelRow,
  NumericTextInput,
  Typography,
  Box,
  useTranslation,
  useDialog,
  useKeyboardHeightAdjustment,
  QueryParamsProvider,
  createQueryParamsStore,
  useNotification,
} from '@openmsupply-client/common';
import { ItemPackagingVariantsTable } from './ItemPackagingVariantsTable';
import {
  ItemVariantFragment,
  PackagingVariantFragment,
  useItemVariant,
} from '../../../api';
import { ManufacturerSearchInput } from '@openmsupply-client/system';
import { ColdStorageTypeInput } from '../../../Components/ColdStorageTypeInput';

export const ItemVariantModal = ({
  itemId,
  variant,
  onClose,
}: {
  itemId: string;
  variant: ItemVariantFragment | null;
  onClose: () => void;
}) => {
  const t = useTranslation();
  const { Modal } = useDialog({ isOpen: true, onClose, disableBackdrop: true });
  const height = useKeyboardHeightAdjustment(500);
  const { success, error } = useNotification();

  const { draft, isComplete, updateDraft, updatePackagingVariant, save } =
    useItemVariant({
      itemId,
      variant,
    });

  return (
    <Modal
      title={variant ? t('label.edit-variant') : t('label.add-variant')}
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
      okButton={
        <DialogButton
          disabled={!isComplete}
          variant="ok"
          onClick={() => {
            save(draft)
              .then(() => {
                success(t('messages.item-variant-saved'))();
                onClose();
              })
              .catch(e => {
                // We create the same error message as we get from the default handler, but prevent duplicates
                // This avoids the same error message being displayed multiple times, and the only appears once bug...
                // https://github.com/msupply-foundation/open-msupply/issues/3984
                if (
                  e instanceof Error &&
                  e.message.includes(t('error.duplicate-item-variant-name'))
                ) {
                  error(t('error.duplicate-item-variant-name'), {
                    preventDuplicate: true,
                  })();
                  return;
                }
                error(t('error.failed-to-save-item-variant'))();
              });
          }}
        />
      }
      height={height}
      width={1000}
      slideAnimation={false}
    >
      <QueryParamsProvider
        createStore={createQueryParamsStore({ initialSortBy: { key: 'name' } })}
      >
        <ItemVariantForm
          updateVariant={updateDraft}
          updatePackagingVariant={updatePackagingVariant}
          variant={draft}
        />
      </QueryParamsProvider>
    </Modal>
  );
};

const ItemVariantForm = ({
  variant,
  updateVariant,
  updatePackagingVariant,
}: {
  variant: ItemVariantFragment;
  updateVariant: (patch: Partial<ItemVariantFragment>) => void;
  updatePackagingVariant: (patch: Partial<PackagingVariantFragment>) => void;
}) => {
  const t = useTranslation();

  return (
    <Box justifyContent="center" display="flex" gap={3}>
      <Box display="flex" flexDirection="column" gap={1} flex={1}>
        <InputWithLabelRow
          label={t('label.name')}
          labelWidth="200"
          Input={
            <BasicTextInput
              value={variant.name}
              onChange={event => {
                updateVariant({ name: event.target.value });
              }}
              fullWidth
            />
          }
        />

        <InputWithLabelRow
          label={t('label.cold-storage-type')}
          labelWidth="200"
          Input={
            <Box width="100%">
              <ColdStorageTypeInput
                value={variant.coldStorageType ?? null}
                onChange={coldStorageType =>
                  updateVariant({
                    coldStorageType,
                    coldStorageTypeId: coldStorageType?.id ?? '',
                  })
                }
              />
            </Box>
          }
        />
        <InputWithLabelRow
          label={t('label.manufacturer')}
          labelWidth="200"
          Input={
            <Box width="100%">
              <ManufacturerSearchInput
                value={variant.manufacturer ?? null}
                onChange={manufacturer =>
                  updateVariant({
                    manufacturer,
                    manufacturerId: manufacturer?.id ?? '',
                  })
                }
              />
            </Box>
          }
        />

        <InputWithLabelRow
          label={t('label.doses-per-unit')}
          labelWidth="200"
          Input={
            <Box width="100%">
              <NumericTextInput
                value={variant.dosesPerUnit ?? undefined}
                onChange={v => {
                  updateVariant({ dosesPerUnit: v });
                }}
                style={{ justifyContent: 'flex-start' }}
              />
            </Box>
          }
        />
      </Box>
      <Box flex={1}>
        <Typography fontWeight="bold">{t('title.packaging')}</Typography>
        <ItemPackagingVariantsTable
          data={variant.packagingVariants}
          update={v => updatePackagingVariant(v)}
        />
      </Box>
    </Box>
  );
};
