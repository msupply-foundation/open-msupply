import React from 'react';
import {
  Tooltip,
  ListOptions,
  ChevronDownIcon,
  RouteBuilder,
  useNavigate,
} from '@openmsupply-client/common';
import { ItemRowFragment } from '../../api';

interface ListItemProps {
  currentItemId?: string | null;
  items: ItemRowFragment[];
  route: RouteBuilder;
}

export const ListItems = ({ currentItemId, items, route }: ListItemProps) => {
  const navigate = useNavigate();
  const value = items?.find(({ id }) => id === currentItemId) ?? null;

  return (
    <Tooltip title={value?.name}>
      <ListOptions
        currentId={value?.id}
        onClick={id => {
          navigate(route.addPart(id).build(), { replace: true });
        }}
        options={
          items?.map(({ id, name }) => ({
            id,
            value: name,
          })) ?? []
        }
        endIcon={
          <ChevronDownIcon
            style={{ width: 17, height: 17, transform: 'rotate(-90deg)' }}
          />
        }
      />
    </Tooltip>
  );
};
