import React, { memo } from 'react';
import {
  ToggleButton,
  useTranslation,
  useConfirmationModal,
} from '@openmsupply-client/common';
import { useInboundShipment } from '../../api';

export const OnHoldButtonComponent = memo(() => {
  const t = useTranslation();
  const {
    query: { data },
    update: { update },
    isHoldable,
  } = useInboundShipment();
  const onHold = data?.onHold ?? false;
  const getConfirmation = useConfirmationModal({
    message: onHold
      ? t('messages.off-hold-confirmation')
      : t('messages.on-hold-confirmation'),
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
