import React from 'react';
import {
  DownloadIcon,
  AppBarButtonsPortal,
  Grid,
  useTranslation,
  LoadingButton,
  EnvUtils,
  Platform,
  RecordPatch,
  FnUtils,
} from '@openmsupply-client/common';
import { Program } from './ListView';

interface ImmunisationsAppBarButtonsProps {
  patch: (patch: RecordPatch<Program>) => void;
}

export const AppBarButtons = ({ patch }: ImmunisationsAppBarButtonsProps) => {
  const t = useTranslation('catalogue');

  const handleClick = () => {
    const id = FnUtils.generateUUID();
    const newProgram = {
      id,
      name: 'new name',
      immunisations: [],
      isNew: true,
    };
    patch({ ...newProgram });
  };

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <LoadingButton
          disabled={EnvUtils.platform === Platform.Android}
          startIcon={<DownloadIcon />}
          variant="outlined"
          isLoading={false}
          onClick={handleClick}
        >
          {t('button.add-new-program')}
        </LoadingButton>
      </Grid>
    </AppBarButtonsPortal>
  );
};
