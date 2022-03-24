import React from 'react';
import {
  DropdownMenu,
  DropdownMenuItem,
  DeleteIcon,
  useTranslation,
} from '@openmsupply-client/common';
import { useDeleteRequestLines } from '../../api';

export const ToolbarDropDown = () => {
  const t = useTranslation('replenishment');
  const { onDelete } = useDeleteRequestLines();
  return (
    <DropdownMenu label={t('label.select')}>
      <DropdownMenuItem IconComponent={DeleteIcon} onClick={onDelete}>
        {t('button.delete-lines', { ns: 'distribution' })}
      </DropdownMenuItem>
    </DropdownMenu>
  );
};
