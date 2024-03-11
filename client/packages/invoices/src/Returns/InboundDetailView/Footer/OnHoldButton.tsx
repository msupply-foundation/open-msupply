import React, { useState, memo } from 'react';
import {
  ToggleButton,
  useTranslation,
  useConfirmationModal,
} from '@openmsupply-client/common';
import { useReturns } from '../../api';

export const OnHoldButtonComponent = memo(() => {
  const t = useTranslation('distribution');
  //   const { onHold, update } = useOutbound.document.fields('onHold');
  const isDisabled = useReturns.utils.inboundIsDisabled();

  // TEMP until 'onHold' update query is available:
  const [onHold, setOnHold] = useState(false);
  const update = ({ onHold }: { onHold: boolean }) => setOnHold(onHold);

  const getConfirmation = useConfirmationModal({
    message: t(
      onHold
        ? 'messages.off-hold-confirmation'
        : 'messages.on-hold-confirmation'
    ),
    title: t('heading.are-you-sure'),
    onConfirm: () => update({ onHold: !onHold }),
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
