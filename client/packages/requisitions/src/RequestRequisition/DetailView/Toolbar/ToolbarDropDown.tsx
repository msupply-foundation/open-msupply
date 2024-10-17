import React from 'react';
import {
  DropdownMenu,
  DropdownMenuItem,
  DeleteIcon,
  useTranslation,
} from '@openmsupply-client/common';
import { useRequest } from '../../api';

interface ToolbarDropDownProps {
  isDisabled: boolean;
}

export const ToolbarDropDown = ({ isDisabled }: ToolbarDropDownProps) => {
  const t = useTranslation('replenishment');
  const onDelete = useRequest.line.delete();

  return (
    <DropdownMenu label={t('label.actions')}>
      <DropdownMenuItem
        IconComponent={DeleteIcon}
        onClick={onDelete}
        disabled={isDisabled}
      >
        {t('button.delete-lines', { ns: 'distribution' })}
      </DropdownMenuItem>
    </DropdownMenu>
  );
};
