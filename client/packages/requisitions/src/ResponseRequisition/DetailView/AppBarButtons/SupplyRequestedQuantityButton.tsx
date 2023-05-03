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
  const getConfirmation = useConfirmationModal({
    onConfirm: supplyRequestedQuantity,
    message: t('messages.supply-to-requested'),
    title: t('heading.supply-to-requested'),
  });

  const label = isRemoteAuthorisation
    ? t('button.supply-to-approved')
    : t('button.supply-to-requested');

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
