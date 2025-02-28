import React from 'react';
import {
  Tooltip,
  RouteBuilder,
  useNavigate,
  useTranslation,
  Box,
} from '@openmsupply-client/common';
import { InvoiceItemFragment } from '../..';
import { ListOption, ListOptions } from './ListOptions';

interface ListItemProps {
  currentItemId: string;
  items: InvoiceItemFragment[];
  route: RouteBuilder;
  showNew?: boolean;
  scrollRef: React.MutableRefObject<HTMLLIElement | null>;
}

export const ListItems = ({
  currentItemId,
  items,
  route,
  showNew = false,
  scrollRef,
}: ListItemProps) => {
  const t = useTranslation();
  const navigate = useNavigate();
  const value = items?.find(({ id }) => id === currentItemId) ?? null;

  let options: ListOption[] =
    items?.map(({ id, name, hasEnteredQuantity }) => ({
      id,
      value: name,
      complete: hasEnteredQuantity,
    })) ?? [];
  if (showNew) {
    options.push({ id: 'new', value: t('label.new-item'), complete: false });
  }

  return (
    <Tooltip title={value?.name}>
      <Box sx={{ flexGrowY: 1, overflow: 'auto', scrollBehavior: 'smooth' }}>
        <ListOptions
          currentId={currentItemId}
          onClick={id => navigate(route.addPart(id).build())}
          options={options}
          scrollRef={scrollRef}
        />
      </Box>
    </Tooltip>
  );
};
