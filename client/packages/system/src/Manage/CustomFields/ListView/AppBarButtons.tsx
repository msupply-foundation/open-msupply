import React from 'react';
import {
  AppBarButtonsPortal,
  Grid,
  ButtonWithIcon,
  useTranslation,
  SaveIcon,
} from '@openmsupply-client/common';

interface AppBarButtonsProps {
  onSave: () => void;
  isDirty: boolean;
  isSaving: boolean;
}

export const AppBarButtonsComponent = ({
  onSave,
  isDirty,
  isSaving,
}: AppBarButtonsProps) => {
  const t = useTranslation();

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ButtonWithIcon
          Icon={<SaveIcon />}
          label={t('button.save')}
          onClick={onSave}
          disabled={!isDirty || isSaving}
        />
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
