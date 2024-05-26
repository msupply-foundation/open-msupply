import React, { memo } from 'react';
import {
  ToggleButton,
  useTranslation,
  useConfirmationModal,
} from '@openmsupply-client/common';
import { useInbound } from '../../api';

export const OnHoldButtonComponent = memo(() => {
  const t = useTranslation('replenishment');
  const { onHold, update } = useInbound.document.fields('onHold');
  const isHoldable = useInbound.utils.isHoldable();
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
      disabled={!isHoldable}
      value={onHold}
      selected={onHold}
      onClick={() => getConfirmation()}
      label={t('label.hold')}
    />
  );
});

export const OnHoldButton = memo(OnHoldButtonComponent);
