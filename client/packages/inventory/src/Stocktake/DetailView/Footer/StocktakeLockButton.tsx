import React, { FC } from 'react';
import {
  useTranslation,
  StocktakeNodeStatus,
  ToggleButton,
  useConfirmationModal,
} from '@openmsupply-client/common';

import { useStocktake } from '../../api';

export const StocktakeLockButton: FC = () => {
  const t = useTranslation('inventory');
  const isDisabled = useStocktake.utils.isDisabled();
  const { isLocked, status, update } = useStocktake.document.fields([
    'isLocked',
    'status',
  ]);

  const message = isLocked
    ? 'messages.unlocked-description'
    : 'messages.locked-description';

  const getConfirmation = useConfirmationModal({
    onConfirm: () => update({ isLocked: !isLocked }),
    title: t('heading.are-you-sure'),
    message: t(message),
  });

  if (isDisabled && !isLocked) return null;

  return (
    <ToggleButton
      disabled={status !== StocktakeNodeStatus.New}
      value={isLocked}
      selected={isLocked}
      onClick={() => getConfirmation()}
      label={t('label.locked')}
    />
  );
};
