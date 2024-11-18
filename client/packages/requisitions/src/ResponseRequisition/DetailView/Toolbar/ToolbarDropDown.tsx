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
  hasLinkedRequisition: boolean;
}

export const ToolbarDropDown = ({
  isDisabled,
  hasLinkedRequisition,
}: ToolbarDropDownProps) => {
  const t = useTranslation();
  const onDelete = useResponse.line.delete();

  return (
    <DropdownMenu label={t('label.actions')}>
      <DropdownMenuItem
        IconComponent={DeleteIcon}
        onClick={onDelete}
        disabled={isDisabled || hasLinkedRequisition}
      >
        {t('button.delete-lines')}
      </DropdownMenuItem>
    </DropdownMenu>
  );
};
