import React from 'react';
import {
  DropdownMenu,
  DropdownMenuItem,
  DeleteIcon,
  useTranslation,
} from '@openmsupply-client/common';
import { useRequest } from '../../api';

export const ToolbarDropDown = () => {
  const t = useTranslation('replenishment');
  const { onDelete } = useRequest.line.delete();
  return (
    <DropdownMenu label={t('label.actions')}>
      <DropdownMenuItem IconComponent={DeleteIcon} onClick={onDelete}>
        {t('button.delete-lines', { ns: 'distribution' })}
      </DropdownMenuItem>
    </DropdownMenu>
  );
};
