import React, { FC } from 'react';
import {
  useTranslation,
  StocktakeNodeStatus,
  ToggleButton,
  useConfirmationModal,
} from '@openmsupply-client/common';

import { useStocktakeFields } from '../../api';

export const StocktakeLockButton: FC = () => {
  const t = useTranslation('inventory');

  const { isLocked, status, update } = useStocktakeFields([
    'isLocked',
    'status',
  ]);

  const message = isLocked
    ? 'messages.unlocked-description'
    : 'messages.locked-description';

  const getUpdateConfirmation = useConfirmationModal({
    onConfirm: () => update({ isLocked: !isLocked }),
    title: t('heading.are-you-sure'),
    message: t(message),
  });

  return (
    <ToggleButton
      disabled={status !== StocktakeNodeStatus.New}
      value={isLocked}
      selected={isLocked}
      onClick={() => getUpdateConfirmation}
      label={t('label.locked')}
    />
  );
};
