import React from 'react';
import {
  AppBarButtonsPortal,
  Grid,
  useTranslation,
  ButtonWithIcon,
  PlusCircleIcon,
  useCheckPermissionWithError,
  UserPermission,
} from '@openmsupply-client/common';

interface ProgramAppBarButtonsProps {
  onCreate: () => void;
}

export const AppBarButtons = ({ onCreate }: ProgramAppBarButtonsProps) => {
  const t = useTranslation('coldchain');
  const checkPermissionDenied = useCheckPermissionWithError(
    UserPermission.EditCentralData
  );

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ButtonWithIcon
          Icon={<PlusCircleIcon />}
          label={t('button.add-new-vaccine-course')}
          onClick={() => {
            if (checkPermissionDenied()) {
              return;
            }
            onCreate();
          }}
        />
      </Grid>
    </AppBarButtonsPortal>
  );
};
