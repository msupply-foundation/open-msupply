import React from 'react';

import {
  AppBarButtonsPortal,
  BasicTextInput,
  ButtonWithIcon,
  FlatButton,
  InputWithLabelRow,
  NothingHere,
  NumericTextInput,
  Typography,
} from '@common/components';
import {
  Box,
  useTranslation,
  PlusCircleIcon,
  EditIcon,
  DeleteIcon,
  useEditModal,
} from '@openmsupply-client/common';
import { ItemPackagingVariantsTable } from './ItemPackagingVariantsTable';
import { ItemVariantFragment, useDeleteItemVariant } from '../../../api';
import { ItemVariantModal } from './ItemVariantModal';
import { BundledItemVariants } from './BundledItemVariants';

export const ItemVariantsTab = ({
  itemId,
  itemVariants,
}: {
  itemId: string;
  itemVariants: ItemVariantFragment[];
}) => {
  const t = useTranslation();

  const { isOpen, onClose, onOpen, entity } =
    useEditModal<ItemVariantFragment>();

  return (
    <>
      {isOpen && (
        <ItemVariantModal onClose={onClose} itemId={itemId} variant={entity} />
      )}
      <AppBarButtonsPortal>
        <ButtonWithIcon
          Icon={<PlusCircleIcon />}
          onClick={() => onOpen()}
          label={t('label.add-variant')}
        />
      </AppBarButtonsPortal>
      <Box flex={1} marginX={2}>
        {itemVariants.length === 0 ? (
          <NothingHere body={t('messages.no-item-variants')} />
        ) : (
          itemVariants.map(v => (
            <ItemVariant
              key={v.id}
              variant={v}
              onOpen={onOpen}
              itemId={itemId}
            />
          ))
        )}
      </Box>
    </>
  );
};

const ItemVariant = ({
  variant,
  itemId,
  onOpen,
}: {
  itemId: string;
  variant: ItemVariantFragment;
  onOpen: (variant?: ItemVariantFragment) => void;
}) => {
  const t = useTranslation();
  const confirmAndDelete = useDeleteItemVariant({ itemId });

  return (
    <Box maxWidth="1000px" margin="25px auto" paddingBottom={6}>
      <Box display="flex" justifyContent="space-between" alignItems="end">
        <Typography variant="h6" fontWeight="bold" color="black">
          {variant.name}
        </Typography>
        <Box display="flex" gap={2}>
          <FlatButton
            label={t('label.edit')}
            onClick={() => onOpen(variant)}
            startIcon={<EditIcon />}
            color="primary"
          />
          <FlatButton
            label={t('label.delete')}
            onClick={() => confirmAndDelete(variant.id)}
            startIcon={<DeleteIcon />}
            color="primary"
          />
        </Box>
      </Box>

      <Box
        justifyContent="center"
        display="flex"
        gap={2}
        alignItems={'center'}
        marginBottom={3}
      >
        <Box display="flex" flexDirection="column" gap={1} flex={1}>
          <InputWithLabelRow
            label={t('label.name')}
            labelWidth="200"
            Input={<BasicTextInput value={variant.name} disabled fullWidth />}
          />

          <InputWithLabelRow
            label={t('label.temperature')}
            labelWidth="200"
            Input={
              <BasicTextInput
                value={variant.coldStorageType?.name ?? ''}
                disabled
                fullWidth
              />
            }
          />
          <InputWithLabelRow
            label={t('label.manufacturer')}
            labelWidth="200"
            Input={
              <BasicTextInput
                value={variant.manufacturer?.name ?? ''}
                disabled
                fullWidth
              />
            }
          />

          <InputWithLabelRow
            label={t('label.doses-per-unit')}
            labelWidth="200"
            Input={
              <Box width="100%">
                <NumericTextInput
                  value={variant.dosesPerUnit ?? undefined}
                  disabled
                  style={{ justifyContent: 'flex-start' }}
                />
              </Box>
            }
          />
        </Box>
        <Box flex={1}>
          <Typography fontWeight="bold">{t('title.packaging')}</Typography>
          <ItemPackagingVariantsTable data={variant.packagingVariants} />
        </Box>
      </Box>
      <BundledItemVariants variant={variant} />
    </Box>
  );
};
