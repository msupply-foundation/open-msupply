import React from 'react';
import { useIntlUtils } from '@common/intl';
import { Grid, FlatButton, TranslateIcon } from '@openmsupply-client/common';
import { LanguageSelector } from './Footer/LanguageSelector';

export const LanguageButton = () => {
  const { currentLanguageName } = useIntlUtils();

  return (
    <Grid container alignSelf="flex-end" p={1}>
      <LanguageSelector>
        <FlatButton
          startIcon={<TranslateIcon fontSize="small" />}
          label={currentLanguageName || ''}
          shrinkThreshold={'sm'}
          onClick={() => {}}
          shouldShrink
          sx={{
            boxShadow: theme => theme.shadows[2],
            borderRadius: 2,
            px: 2,
          }}
        />
      </LanguageSelector>
    </Grid>
  );
};
