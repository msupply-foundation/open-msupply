import React from 'react';
import {
  ButtonWithIcon,
  PlusCircleIcon,
  useTranslation,
  useConfirmationModal,
} from '@openmsupply-client/common';
import { useSupplyRequestedQuantity } from '../../api';

export const SupplyRequestedQuantityButtonComponent = () => {
  const t = useTranslation('distribution');
  const { mutate: supplyRequestedQuantity } = useSupplyRequestedQuantity();
  const getConfirmation = useConfirmationModal({
    onConfirm: supplyRequestedQuantity,
    message: t('messages.supply-to-requested'),
    title: t('heading.supply-to-requested'),
  });

  return (
    <ButtonWithIcon
      Icon={<PlusCircleIcon />}
      label={t('button.supply-to-requested')}
      onClick={() => getConfirmation()}
    />
  );
};

export const SupplyRequestedQuantityButton = React.memo(
  SupplyRequestedQuantityButtonComponent
);
