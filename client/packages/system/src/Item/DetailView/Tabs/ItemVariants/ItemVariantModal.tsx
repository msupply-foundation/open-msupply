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
  const { success } = useNotification();

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
            save(draft);
            success(t('messages.item-variant-saved'))();
            onClose();
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
          label={t('label.temperature')}
          labelWidth="200"
          Input={
            // TODO: temp range dropdown
            <BasicTextInput
              value={variant.coldStorageTypeId}
              onChange={event => {
                updateVariant({
                  coldStorageTypeId: event.target.value,
                });
              }}
              fullWidth
            />
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
