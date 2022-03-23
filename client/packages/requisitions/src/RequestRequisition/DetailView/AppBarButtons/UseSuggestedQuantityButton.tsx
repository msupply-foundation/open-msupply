import React from 'react';
import {
  ButtonWithIcon,
  EditIcon,
  useTranslation,
  useConfirmationModal,
} from '@openmsupply-client/common';
import { useSuggestedQuantity } from '../../api';

export const UseSuggestedQuantityButtonComponent = () => {
  const t = useTranslation('replenishment');
  const { mutate: setRequestedToSuggested } = useSuggestedQuantity();
  const getConfirmation = useConfirmationModal({
    onConfirm: setRequestedToSuggested,
    message: t('messages.requested-to-suggested'),
    title: t('heading.requested-to-suggested'),
  });

  return (
    <ButtonWithIcon
      Icon={<EditIcon />}
      label={t('button.requested-to-suggested')}
      onClick={() => getConfirmation()}
    />
  );
};

export const UseSuggestedQuantityButton = React.memo(
  UseSuggestedQuantityButtonComponent
);
