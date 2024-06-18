import React from 'react';
import {
  PlusCircleIcon,
  AppBarButtonsPortal,
  Grid,
  useTranslation,
  ButtonWithIcon,
  useCheckPermissionWithError,
  UserPermission,
} from '@openmsupply-client/common';

interface ImmunisationsAppBarButtonsProps {
  onCreate: () => void;
}

export const AppBarButtons = ({
  onCreate,
}: ImmunisationsAppBarButtonsProps) => {
  const t = useTranslation('coldchain');
  const checkPermissionDenied = useCheckPermissionWithError(
    UserPermission.EditCentralData
  );

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ButtonWithIcon
          startIcon={<PlusCircleIcon />}
          variant="outlined"
          onClick={() => {
            if (checkPermissionDenied()) {
              return;
            }
            onCreate();
          }}
          Icon={<PlusCircleIcon />}
          label={t('button.add-new-program')}
        >
          {t('button.add-new-program')}
        </ButtonWithIcon>
      </Grid>
    </AppBarButtonsPortal>
  );
};
