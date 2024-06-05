import React from 'react';
import {
  DownloadIcon,
  AppBarButtonsPortal,
  Grid,
  useTranslation,
  LoadingButton,
  EnvUtils,
  Platform,
} from '@openmsupply-client/common';

interface ProgramAppBarButtonsProps {
  onCreate: () => void;
}

export const AppBarButtons = ({ onCreate }: ProgramAppBarButtonsProps) => {
  const t = useTranslation('catalogue');

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <LoadingButton
          disabled={EnvUtils.platform === Platform.Android}
          startIcon={<DownloadIcon />}
          variant="outlined"
          isLoading={false}
          onClick={onCreate}
        >
          {t('button.add-new-immunisation')}
        </LoadingButton>
      </Grid>
    </AppBarButtonsPortal>
  );
};
