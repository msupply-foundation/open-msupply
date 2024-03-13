import React, { FC } from 'react';
import {
  AppBarContentPortal,
  Box,
  useTranslation,
} from '@openmsupply-client/common';
import { useAssets } from '../api';

export const Toolbar: FC = () => {
  const { data } = useAssets.document.get();

  const { catalogueItem } = useAssets.document.fields();
  const t = useTranslation('coldchain');

  if (!data) return null;

  return (
    <AppBarContentPortal sx={{ display: 'flex', flex: 1, marginBottom: 1 }}>
      <Box paddingLeft={4} display="flex" flex={1} alignItems="flex-start">
        <Box
          flex={0}
          display="flex"
          alignItems="flex-start"
          flexDirection="column"
        >
          <Box sx={{ fontWeight: 'bold' }} paddingRight={2}>
            {t('label.manufacturer')}:
          </Box>
          <Box sx={{ fontWeight: 'bold' }} paddingRight={2}>
            {t('label.model')}:
          </Box>
        </Box>
        <Box
          flex={1}
          display="flex"
          alignItems="flex-start"
          flexDirection="column"
        >
          <Box flex={1}>{catalogueItem?.manufacturer}</Box>
          <Box flex={1}>{catalogueItem?.model}</Box>
        </Box>
      </Box>
    </AppBarContentPortal>
  );
};
