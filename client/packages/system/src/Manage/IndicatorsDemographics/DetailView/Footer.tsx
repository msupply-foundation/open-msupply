import React, { memo } from 'react';
import {
  Box,
  ButtonWithIcon,
  useTranslation,
  AppFooterPortal,
  LoadingButton,
  UserPermission,
  useCallbackWithPermission,
} from '@openmsupply-client/common';
import { XCircleIcon } from '@common/icons';

interface DemographicsFooterProps {
  isDirty: boolean;
  cancel: () => void;
  save: () => void;
}

export const FooterComponent = ({
  isDirty,
  save,
  cancel,
}: DemographicsFooterProps) => {
  const t = useTranslation();
  const onClick = useCallbackWithPermission(
    UserPermission.EditCentralData,
    save
  );
  return (
    <AppFooterPortal
      Content={
        <Box
          gap={2}
          display="flex"
          flexDirection="row"
          alignItems="center"
          justifyContent="flex-end"
          padding={2}
        >
          <ButtonWithIcon
            Icon={<XCircleIcon />}
            onClick={cancel}
            label={t('button.cancel')}
            disabled={!isDirty}
            color="secondary"
          />
          <LoadingButton
            onClick={onClick}
            disabled={!isDirty}
            isLoading={false}
            color="secondary"
            label={t('button.save')}
          />
        </Box>
      }
    />
  );
};

export const Footer = memo(FooterComponent);
