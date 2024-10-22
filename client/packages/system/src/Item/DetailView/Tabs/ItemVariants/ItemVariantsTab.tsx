import React, { useState } from 'react';

import {
  AppBarButtonsPortal,
  BasicTextInput,
  ButtonWithIcon,
  InputWithLabelRow,
  Typography,
} from '@common/components';
import {
  Box,
  useTranslation,
  PlusCircleIcon,
} from '@openmsupply-client/common';
import {
  ItemPackagingVariantsTable,
  PackagingVariant,
} from './ItemPackagingVariantsTable';

type Variant = {
  id: string;
  name: string;
  manufacturerId?: string;
  coldStorageTypeId?: string;
  packagingVariants: PackagingVariant[];
};

const packVariants = [
  { id: '1', level: 'Primary', name: 'Primary', packSize: 1, volumePerUnit: 1 },
  {
    id: '2',
    level: 'Secondary',
    name: 'Secondary',
    packSize: 1,
    volumePerUnit: 3,
  },
  {
    id: '3',
    level: 'Tertiary',
    name: 'Tertiary',
    packSize: 1,
    volumePerUnit: 1,
  },
];

export const ItemVariantsTab = ({ itemId }: { itemId?: string }) => {
  const t = useTranslation();
  const [variants, setVariants] = useState<Variant[]>([]);

  const setVariant = (variant: Variant) => {
    const idx = variants.findIndex(v => v.id === variant.id);

    if (idx !== -1) {
      variants[idx] = variant;
      setVariants([...variants]);
    } else {
      setVariants([...variants, variant]);
    }
  };

  return (
    <>
      <AppBarButtonsPortal>
        <ButtonWithIcon
          Icon={<PlusCircleIcon />}
          onClick={() => {
            setVariant({
              id: Date.now().toString(),
              name: '',
              packagingVariants: [...packVariants],
            });
          }}
          label={t('label.add-variant')}
        />
      </AppBarButtonsPortal>
      <Box flex={1} marginX={2}>
        {variants.map((v, idx) => (
          <ItemVariant variant={v} setVariant={setVariant} index={idx} />
        ))}
      </Box>
    </>
  );
};

const ItemVariant = ({
  variant,
  index,
  setVariant,
}: {
  variant: Variant;
  index: number;
  setVariant: (variant: Variant) => void;
}) => {
  const t = useTranslation();

  return (
    <Box maxWidth="1000px" margin="25px auto">
      <Typography variant="h5" fontWeight="bold">
        {variant.name || `${t('label.variant')} ${index + 1}`}
      </Typography>

      <Box justifyContent="center" display="flex" gap={2}>
        <Box
          marginTop={5}
          display="flex"
          flexDirection="column"
          gap={1}
          flex={1}
        >
          <InputWithLabelRow
            label={t('label.name')}
            labelWidth="200"
            Input={
              <BasicTextInput
                value={variant.name}
                onChange={event => {
                  setVariant({ ...variant, name: event.target.value });
                }}
                fullWidth
              />
            }
          />

          <InputWithLabelRow
            label={t('label.cold-storage-type')}
            labelWidth="200"
            Input={
              // TODO: temp range dropdown
              <BasicTextInput
                value={variant.coldStorageTypeId}
                onChange={event => {
                  setVariant({
                    ...variant,
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
              // TODO ManufacturerSearch
              <BasicTextInput
                value={variant.manufacturerId}
                onChange={event => {
                  setVariant({
                    ...variant,
                    manufacturerId: event.target.value,
                  });
                }}
                fullWidth
              />
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
