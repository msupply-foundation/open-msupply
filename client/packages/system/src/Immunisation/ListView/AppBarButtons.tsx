import React from 'react';
import {
  PlusCircleIcon,
  AppBarButtonsPortal,
  Grid,
  useTranslation,
  ButtonWithIcon,
  UserPermission,
  useDisabledNotificationToast,
  useAuthContext,
} from '@openmsupply-client/common';

interface ImmunisationsAppBarButtonsProps {
  onCreate: () => void;
}

export const AppBarButtons = ({
  onCreate,
}: ImmunisationsAppBarButtonsProps) => {
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
          startIcon={<PlusCircleIcon />}
          variant="outlined"
          onClick={onClick}
          Icon={<PlusCircleIcon />}
          label={t('button.add-new-program')}
        >
          {t('button.add-new-program')}
        </ButtonWithIcon>
      </Grid>
    </AppBarButtonsPortal>
  );
};
