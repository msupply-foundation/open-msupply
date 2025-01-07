import React from 'react';
import {
  Tooltip,
  ListOptions,
  RouteBuilder,
  useNavigate,
  useTranslation,
  Box,
  FlatButton,
  PlusCircleIcon,
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

  return (
    <Tooltip title={value?.name}>
      <Box display="flex" flexDirection="column" height="100%">
        <Box sx={{ flexGrowY: 1, overflow: 'auto', scrollBehavior: 'smooth' }}>
          <ListOptions
            currentId={value?.id}
            onClick={id => {
              navigate(route.addPart(id).build());
            }}
            options={options}
            enteredLineIds={enteredLineIds}
          />
        </Box>
        {showNew && (
          <FlatButton
            label={t('label.new-item')}
            onClick={() => navigate(route.addPart('new').build())}
            startIcon={<PlusCircleIcon />}
            sx={{
              position: 'sticky',
              bottom: 0,
              padding: '1em',
              justifyContent: 'flex-start',
            }}
          />
        )}
      </Box>
    </Tooltip>
  );
};
