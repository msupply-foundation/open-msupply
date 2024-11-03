import React from 'react';
import {
  useToggle,
  Tooltip,
  ListOptions,
  ChevronDownIcon,
} from '@openmsupply-client/common';
import { ItemRowFragment } from '../../api';

interface ListItemProps {
  currentItemId?: string | null;
  items: ItemRowFragment[];
}

export const ListItems = ({ currentItemId, items }: ListItemProps) => {
  const value = items?.find(({ id }) => id === currentItemId) ?? null;
  const selectControl = useToggle();

  return (
    <Tooltip title={value?.name}>
      <ListOptions
        onClick={() => selectControl.toggleOn()}
        options={
          items?.map(({ id, name }) => ({
            id,
            value: name,
          })) ?? []
        }
        endIcon={
          selectControl.isOn ? (
            <ChevronDownIcon
              style={{ width: 17, height: 17, transform: 'rotate(-90deg)' }}
            />
          ) : undefined
        }
      />
    </Tooltip>
  );
};
