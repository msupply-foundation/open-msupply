import React from 'react';
import {
  ButtonWithIcon,
  ZapIcon,
  useTranslation,
  useConfirmationModal,
} from '@openmsupply-client/common';
import { useRequest } from '../../api';

export const UseSuggestedQuantityButtonComponent = () => {
  const t = useTranslation('replenishment');
  const { mutate: setRequestedToSuggested } =
    useRequest.utils.suggestedQuantity();
  const isDisabled = useRequest.utils.isDisabled();

  const getConfirmation = useConfirmationModal({
    iconType: 'info',
    onConfirm: setRequestedToSuggested,
    message: t('messages.requested-to-suggested'),
    title: t('heading.requested-to-suggested'),
  });

  return (
    <ButtonWithIcon
      Icon={<ZapIcon />}
      label={t('button.requested-to-suggested')}
      onClick={() => getConfirmation()}
      disabled={isDisabled}
    />
  );
};

export const UseSuggestedQuantityButton = React.memo(
  UseSuggestedQuantityButtonComponent
);
