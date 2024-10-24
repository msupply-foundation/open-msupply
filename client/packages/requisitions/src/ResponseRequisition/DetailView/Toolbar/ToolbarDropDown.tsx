import React from 'react';
import {
  DropdownMenu,
  DropdownMenuItem,
  DeleteIcon,
  useTranslation,
} from '@openmsupply-client/common';
import { useResponse } from '../../api';

interface ToolbarDropDownProps {
  isDisabled: boolean;
}

export const ToolbarDropDown = ({ isDisabled }: ToolbarDropDownProps) => {
  const t = useTranslation();
  const onDelete = useResponse.line.delete();

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
