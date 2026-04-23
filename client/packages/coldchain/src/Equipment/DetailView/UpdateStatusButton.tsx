import React from 'react';
import {
  ButtonWithIcon,
  useTranslation,
  PlusCircleIcon,
  useIsExtraSmallScreen,
  useNotification,
  UserPermission,
  useAuthContext,
} from '@openmsupply-client/common';
import { useStatusLogDialog } from './useStatusLogDialog';

export const UpdateStatusButtonComponent = ({
  assetId,
}: {
  assetId: string | undefined;
}) => {
  const t = useTranslation();
  const isExtraSmallScreen = useIsExtraSmallScreen();
  const { info } = useNotification();
  const { userHasPermission } = useAuthContext();
  const { StatusModal, showDialog } = useStatusLogDialog(assetId);

  const onClick = () => {
    if (
      userHasPermission(UserPermission.AssetMutate) ||
      userHasPermission(UserPermission.AssetStatusMutate)
    ) {
      showDialog();
    } else {
      info(t('error.no-asset-edit-status-permission'))();
    }
  };

  return (
    <>
      {StatusModal}
      <ButtonWithIcon
        shouldShrink={!isExtraSmallScreen}
        Icon={<PlusCircleIcon />}
        label={t('button.update-status')}
        onClick={onClick}
      />
    </>
  );
};

export const UpdateStatusButton = React.memo(UpdateStatusButtonComponent);
