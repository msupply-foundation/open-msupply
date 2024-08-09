import React, { memo } from 'react';
import {
  ToggleButton,
  useTranslation,
  useConfirmationModal,
} from '@openmsupply-client/common';
import { useReturns } from '../../api';

export const OnHoldButtonComponent = memo(() => {
  const t = useTranslation('distribution');
  const { mutateAsync } = useReturns.document.updateCustomerReturn();

  const isDisabled = useReturns.utils.customerIsDisabled();

  const { data: { id, onHold } = { onHold: false } } =
    useReturns.document.customerReturn();

  const updateOnHold = (onHold: boolean) => {
    if (!id) return;
    mutateAsync({ id, onHold });
  };

  const getConfirmation = useConfirmationModal({
    message: t(
      onHold
        ? 'messages.off-hold-confirmation'
        : 'messages.on-hold-confirmation'
    ),
    title: t('heading.are-you-sure'),
    onConfirm: () => updateOnHold(!onHold),
  });

  return (
    <ToggleButton
      disabled={isDisabled}
      value={onHold}
      selected={onHold}
      onClick={() => getConfirmation()}
      label={t('label.hold')}
    />
  );
});

export const OnHoldButton = memo(OnHoldButtonComponent);
