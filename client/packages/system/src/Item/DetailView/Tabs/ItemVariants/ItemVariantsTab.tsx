import React from 'react';

import {
  AppBarButtonsPortal,
  BasicTextInput,
  ButtonWithIcon,
  FlatButton,
  InputWithLabelRow,
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
import { ItemVariantFragment } from '../../../api';
import { ItemVariantModal } from './ItemVariantModal';

export const ItemVariantsTab = ({
  itemVariants,
}: {
  itemVariants: ItemVariantFragment[];
}) => {
  const t = useTranslation();

  const { isOpen, onClose, onOpen, entity } =
    useEditModal<ItemVariantFragment>();

  return (
    <>
      {isOpen && (
        <ItemVariantModal onClose={onClose} itemId="id" variant={entity} />
      )}
      <AppBarButtonsPortal>
        <ButtonWithIcon
          Icon={<PlusCircleIcon />}
          onClick={() => onOpen()}
          label={t('label.add-variant')}
        />
      </AppBarButtonsPortal>
      <Box flex={1} marginX={2}>
        {itemVariants.map(v => (
          <ItemVariant variant={v} onOpen={onOpen} />
        ))}
      </Box>
    </>
  );
};

const ItemVariant = ({
  variant,
  onOpen,
}: {
  variant: ItemVariantFragment;
  onOpen: (variant?: ItemVariantFragment) => void;
}) => {
  const t = useTranslation();

  return (
    <Box maxWidth="1000px" margin="25px auto 75px">
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
            onClick={() => {}}
            startIcon={<DeleteIcon />}
            color="primary"
          />
        </Box>
      </Box>

      <Box justifyContent="center" display="flex" gap={2} alignItems={'center'}>
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
              // TODO: temp range dropdown
              <BasicTextInput
                value={variant.coldStorageTypeId}
                disabled
                fullWidth
              />
            }
          />
          <InputWithLabelRow
            label={t('label.manufacturer')}
            labelWidth="200"
            Input={
              // TODO ManufacturerSearch
              <BasicTextInput
                value={variant.manufacturerId}
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
    </Box>
  );
};
