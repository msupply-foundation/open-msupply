import React from 'react';
import {
  AppBarButtonsPortal,
  Grid,
  ButtonWithIcon,
  ToggleState,
  UploadIcon,
  useTranslation,
} from '@openmsupply-client/common';

export const AppBarButtonsComponent = ({
  importModalController,
}: {
  importModalController: ToggleState;
}) => {
  const t = useTranslation();

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ButtonWithIcon
          Icon={<UploadIcon />}
          label={t('button.import-properties')}
          onClick={importModalController.toggleOn}
        />
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
