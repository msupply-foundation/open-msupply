import React from 'react';
import {
  AppBarButtonsPortal,
  Grid,
  useTranslation,
  ButtonWithIcon,
  PlusCircleIcon,
  UserPermission,
  useAuthContext,
  useDisabledNotificationToast,
} from '@openmsupply-client/common';

interface ProgramAppBarButtonsProps {
  onCreate: () => void;
}

export const AppBarButtons = ({ onCreate }: ProgramAppBarButtonsProps) => {
  const t = useTranslation('coldchain');
  const { userHasPermission } = useAuthContext();
  const showDisabledNotification = useDisabledNotificationToast();

  const onClick = () => {
    if (userHasPermission(UserPermission.EditCentralData)) onCreate();
    else showDisabledNotification();
  };

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ButtonWithIcon
          Icon={<PlusCircleIcon />}
          label={t('button.add-new-vaccine-course')}
          onClick={onClick}
        />
      </Grid>
    </AppBarButtonsPortal>
  );
};
