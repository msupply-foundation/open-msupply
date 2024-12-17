import React from 'react';
import {
  Tooltip,
  ListOptions,
  RouteBuilder,
  useNavigate,
  useTranslation,
} from '@openmsupply-client/common';
import { ItemRowFragment } from '../../api';

interface ListItemProps {
  currentItemId?: string | null;
  items: ItemRowFragment[];
  route: RouteBuilder;
  enteredLineIds?: string[];
  showNew?: boolean;
}

export const ListItems = ({
  currentItemId,
  items,
  route,
  enteredLineIds,
  showNew = false,
}: ListItemProps) => {
  const t = useTranslation();
  const navigate = useNavigate();
  const value = items?.find(({ id }) => id === currentItemId) ?? null;

  let options =
    items?.map(({ id, name }) => ({
      id,
      value: name,
    })) ?? [];
  if (showNew) {
    options.push({ id: 'new', value: t('label.new-item') });
  }

  return (
    <Tooltip title={value?.name}>
      <ListOptions
        currentId={value?.id ?? 'new'}
        onClick={id => {
          navigate(route.addPart(id).build());
        }}
        options={options}
        enteredLineIds={enteredLineIds}
      />
    </Tooltip>
  );
};
