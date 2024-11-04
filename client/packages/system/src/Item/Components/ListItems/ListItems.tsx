import React from 'react';
import {
  Tooltip,
  ListOptions,
  ChevronDownIcon,
  RouteBuilder,
  useNavigate,
  CheckIcon,
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
        startIcon={
          <CheckIcon
            style={{
              backgroundColor: '#33A901',
              borderRadius: '50%',
              padding: '2px',
              color: 'white',
              height: 18,
              width: 18,
            }}
          />
        }
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
        enteredLineIds={enteredLineIds}
      />
    </Tooltip>
  );
};
