import React, { FC } from 'react';
import {
  useTranslation,
  StocktakeNodeStatus,
  ToggleButton,
  useConfirmationModal,
} from '@openmsupply-client/common';

import { useStocktakeOld } from '../../api';

export const StocktakeLockButton: FC = () => {
  const t = useTranslation();
  const isDisabled = useStocktakeOld.utils.isDisabled();
  const { isLocked, status, update } = useStocktakeOld.document.fields([
    'isLocked',
    'status',
  ]);

  const message = isLocked
    ? t('messages.not-on-hold-description')
    : t('messages.on-hold-description');

  const getConfirmation = useConfirmationModal({
    onConfirm: () => update({ isLocked: !isLocked }),
    title: t('heading.are-you-sure'),
    message,
  });

  if (isDisabled && !isLocked) return null;

  return (
    <ToggleButton
      disabled={status !== StocktakeNodeStatus.New}
      value={isLocked}
      selected={isLocked}
      onClick={() => getConfirmation()}
      label={t('label.on-hold')}
    />
  );
};
