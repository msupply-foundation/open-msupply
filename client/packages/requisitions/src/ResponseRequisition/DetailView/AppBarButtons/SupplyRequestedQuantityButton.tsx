import React from 'react';
import {
  ButtonWithIcon,
  ZapIcon,
  useTranslation,
  useConfirmationModal,
} from '@openmsupply-client/common';
import { useResponse } from '../../api';

export const SupplyRequestedQuantityButtonComponent = () => {
  const t = useTranslation('distribution');
  const isDisabled = useResponse.utils.isDisabled();
  const { isRemoteAuthorisation } = useResponse.utils.isRemoteAuthorisation();
  const { mutate: supplyRequestedQuantity } =
    useResponse.utils.supplyRequested();

  const label = isRemoteAuthorisation
    ? t('button.supply-to-approved')
    : t('button.supply-to-requested');

  const getConfirmation = useConfirmationModal({
    iconType: 'info',
    onConfirm: supplyRequestedQuantity,
    message: isRemoteAuthorisation
      ? t('messages.supply-to-approved')
      : t('messages.supply-to-requested'),
    title: isRemoteAuthorisation
      ? t('heading.supply-to-approved')
      : t('heading.supply-to-requested'),
  });

  return (
    <ButtonWithIcon
      disabled={isDisabled}
      Icon={<ZapIcon />}
      label={label}
      onClick={() => getConfirmation()}
    />
  );
};

export const SupplyRequestedQuantityButton = React.memo(
  SupplyRequestedQuantityButtonComponent
);
