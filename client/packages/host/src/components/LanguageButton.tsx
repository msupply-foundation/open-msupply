import React from 'react';
import { useIntlUtils } from '@common/intl';
import {
  Grid,
  ShrinkableBaseButton,
  TranslateIcon,
} from '@openmsupply-client/common';
import { LanguageSelector } from './Footer/LanguageSelector';

export const LanguageButton = () => {
  const { currentLanguageName } = useIntlUtils();

  return (
    <Grid container alignSelf="flex-end" p={1}>
      <LanguageSelector>
        <ShrinkableBaseButton
          startIcon={<TranslateIcon fontSize="small" />}
          label={currentLanguageName || ''}
          shrinkThreshold={'sm'}
          variant="outlined"
          shouldShrink
        />
      </LanguageSelector>
    </Grid>
  );
};
