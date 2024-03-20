import React, { memo } from 'react';
import {
  ToggleButton,
  useTranslation,
  useConfirmationModal,
} from '@openmsupply-client/common';
import { useReturns } from '../../api';

export const OnHoldButtonComponent = memo(() => {
  const t = useTranslation('distribution');
  const { mutateAsync } = useReturns.document.updateOutboundReturn();
  //   const isDisabled = useOutbound.utils.isDisabled();
  const isDisabled = false; // TODO

  const { data: { id, onHold } = { onHold: false } } =
    useReturns.document.outboundReturn();

  const getConfirmation = useConfirmationModal({
    message: t(
      onHold
        ? 'messages.off-hold-confirmation'
        : 'messages.on-hold-confirmation'
    ),
    title: t('heading.are-you-sure'),
    onConfirm: () => {
      if (!id) return;
      mutateAsync({ id, onHold: !onHold });
    },
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
