import React from 'react';
import {
  Tooltip,
  ListOptions,
  RouteBuilder,
  useNavigate,
} from '@openmsupply-client/common';
import { ItemRowFragment } from '../../api';

interface ListItemProps {
  currentItemId?: string | null;
  items: ItemRowFragment[];
  route: RouteBuilder;
  enteredLineIds?: string[];
}

export const ListItems = ({
  currentItemId,
  items,
  route,
  enteredLineIds,
}: ListItemProps) => {
  const navigate = useNavigate();
  const value = items?.find(({ id }) => id === currentItemId) ?? null;

  return (
    <Tooltip title={value?.name}>
      <ListOptions
        currentId={value?.id}
        onClick={id => {
          navigate(route.addPart(id).build());
        }}
        options={
          items?.map(({ id, name }) => ({
            id,
            value: name,
          })) ?? []
        }
        enteredLineIds={enteredLineIds}
      />
    </Tooltip>
  );
};
