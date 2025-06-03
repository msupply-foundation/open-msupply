import React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { UNDEFINED_STRING_VALUE } from '@common/utils';
import { Grid, useTranslation } from 'packages/common/src';

interface PackagingVariant {
  id: string;
  name?: string;
  packagingLevel?: number;
  packSize?: number | null;
  volumePerUnit?: number | null;
}

interface PartialItemVariantFragment {
  name: string;
  dosesPerUnit?: number;
  vvmType?: string | null;
  manufacturer?: {
    name: string;
  } | null;
  item?: {
    isVaccine?: boolean;
  } | null;
  packagingVariants?: PackagingVariant[];
}

interface Props {
  variant: PartialItemVariantFragment;
}

export const VariantPopoverDetails = ({ variant }: Props) => {
  const t = useTranslation();
  return (
    <Box
      display="flex"
      flexDirection="column"
      gap={1}
      padding={1}
      maxWidth={600}
    >
      <Grid container gap={2}>
        <Grid>
          <Typography noWrap>
            <strong>{t('label.name')}: </strong>
            {variant?.name}
          </Typography>
          <Typography>
            <strong>{t('label.manufacturer')}: </strong>
            {variant?.manufacturer?.name ?? UNDEFINED_STRING_VALUE}
          </Typography>
          {variant?.item?.isVaccine && (
            <>
              <Typography>
                <strong>{t('label.doses-per-unit')}: </strong>
                {variant?.dosesPerUnit ?? UNDEFINED_STRING_VALUE}
              </Typography>
              <Typography>
                <strong>{t('label.vvm-type')}: </strong>
                {variant?.vvmType ?? UNDEFINED_STRING_VALUE}
              </Typography>
            </>
          )}
        </Grid>
        <Grid>
          <>
            <Typography fontWeight="bold">{t('title.packaging')}</Typography>
            <Stack spacing={2}>
              {variant?.packagingVariants?.map(item => (
                <Box key={item.id} ml={2}>
                  <Typography>
                    {t('label.name')}: {item.name ?? UNDEFINED_STRING_VALUE}
                  </Typography>
                  <Typography>
                    {t('label.level')}:{' '}
                    {item.packagingLevel ?? UNDEFINED_STRING_VALUE}
                  </Typography>
                  <Typography>
                    {t('label.pack-size')}:{' '}
                    {item.packSize ?? UNDEFINED_STRING_VALUE}
                  </Typography>
                  <Typography>
                    {t('label.volume-per-unit')}:{' '}
                    {item.volumePerUnit ?? UNDEFINED_STRING_VALUE}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </>
        </Grid>
      </Grid>
    </Box>
  );
};
