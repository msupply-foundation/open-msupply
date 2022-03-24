import React from 'react';
import {
  ButtonWithIcon,
  ZapIcon,
  useTranslation,
  useConfirmationModal,
} from '@openmsupply-client/common';
import { useSupplyRequestedQuantity, useIsResponseDisabled } from '../../api';

export const SupplyRequestedQuantityButtonComponent = () => {
  const t = useTranslation('distribution');
  const isDisabled = useIsResponseDisabled();
  const { mutate: supplyRequestedQuantity } = useSupplyRequestedQuantity();
  const getConfirmation = useConfirmationModal({
    onConfirm: supplyRequestedQuantity,
    message: t('messages.supply-to-requested'),
    title: t('heading.supply-to-requested'),
  });

  return (
    <ButtonWithIcon
      disabled={isDisabled}
      Icon={<ZapIcon />}
      label={t('button.supply-to-requested')}
      onClick={() => getConfirmation()}
    />
  );
};

export const SupplyRequestedQuantityButton = React.memo(
  SupplyRequestedQuantityButtonComponent
);
