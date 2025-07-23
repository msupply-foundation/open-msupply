import React from 'react';

import {
  BasicTextInput,
  InputWithLabelRow,
  Typography,
  Box,
  useTranslation,
  QueryParamsProvider,
  createQueryParamsStore,
} from '@openmsupply-client/common';
import { ItemPackagingVariantsTable } from './ItemPackagingVariantsTable';
import { ItemVariantFragment, PackagingVariantFragment } from '../../../api';
import { ManufacturerSearchInput } from '@openmsupply-client/system';
import { ColdStorageTypeInput } from '../../../Components/ColdStorageTypeInput';

export const ItemVariantForm = ({
  variant,
  updateVariant,
  updatePackagingVariant,
  isVaccine,
}: {
  variant: ItemVariantFragment;
  updateVariant?: (patch: Partial<ItemVariantFragment>) => void;
  updatePackagingVariant?: (patch: Partial<PackagingVariantFragment>) => void;
  isVaccine?: boolean;
}) => {
  const t = useTranslation();

  const disabled = !updateVariant;

  return (
    <QueryParamsProvider
      createStore={createQueryParamsStore({ initialSortBy: { key: 'name' } })}
    >
      <Box justifyContent="center" display="flex" gap={3}>
        <Box display="flex" flexDirection="column" gap={1} flex={1}>
          <Typography fontWeight="500" marginBottom={2}>
            {t('title.variant-details')}
          </Typography>
          <InputWithLabelRow
            label={t('label.name')}
            labelWidth="200"
            Input={
              <BasicTextInput
                autoFocus
                value={variant.name}
                onChange={event => {
                  updateVariant?.({ name: event.target.value });
                }}
                fullWidth
                disabled={disabled}
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
                  onChange={coldStorageType => {
                    updateVariant?.({
                      coldStorageType,
                      coldStorageTypeId: coldStorageType?.id ?? null,
                    });
                  }}
                  disabled={disabled}
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
                    updateVariant?.({
                      manufacturer,
                      manufacturerId: manufacturer?.id ?? null,
                    })
                  }
                  disabled={disabled}
                />
              </Box>
            }
          />
          {isVaccine && (
            <InputWithLabelRow
              label={t('label.vvm-type')}
              labelWidth="200"
              Input={
                <BasicTextInput
                  value={variant.vvmType}
                  onChange={event => {
                    updateVariant?.({ vvmType: event.target.value });
                  }}
                  fullWidth
                  disabled={disabled}
                />
              }
            />
          )}
        </Box>
        <Box flex={1}>
          <Typography fontWeight="500">{t('title.packaging')}</Typography>
          <ItemPackagingVariantsTable
            data={variant.packagingVariants}
            update={updatePackagingVariant}
          />
        </Box>
      </Box>
    </QueryParamsProvider>
  );
};
