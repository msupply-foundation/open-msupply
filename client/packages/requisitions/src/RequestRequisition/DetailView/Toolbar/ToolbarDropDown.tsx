import React from 'react';
import {
  DropdownMenu,
  DropdownMenuItem,
  DeleteIcon,
  useTranslation,
} from '@openmsupply-client/common';
import { useIsRequestDisabled, useDeleteRequestLines } from '../../api';

export const ToolbarDropDown = () => {
  const t = useTranslation('replenishment');
  const isDisabled = useIsRequestDisabled();
  const { onDelete } = useDeleteRequestLines();
  return (
    <DropdownMenu disabled={isDisabled} label={t('label.select')}>
      <DropdownMenuItem IconComponent={DeleteIcon} onClick={onDelete}>
        {t('button.delete-lines', { ns: 'distribution' })}
      </DropdownMenuItem>
    </DropdownMenu>
  );
};
