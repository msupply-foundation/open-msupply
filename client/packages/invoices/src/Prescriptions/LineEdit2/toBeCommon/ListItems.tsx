import React from 'react';
import {
  Tooltip,
  RouteBuilder,
  useNavigate,
  useTranslation,
  useConfirmationModal,
  Box,
} from '@openmsupply-client/common';
import { InvoiceItemFragment } from '../..';
import { ListOption, ListOptions } from './ListOptions';

interface ListItemProps {
  currentItemId?: string | null;
  items: InvoiceItemFragment[];
  route: RouteBuilder;
  isDirty?: boolean;
  showNew?: boolean;
  handleSaveNew?: () => void;
  scrollRef: React.MutableRefObject<HTMLLIElement | null>;
}

export const ListItems = ({
  currentItemId,
  items,
  route,
  showNew = false,
  isDirty = false,
  handleSaveNew = () => {},
  scrollRef,
}: ListItemProps) => {
  const t = useTranslation();
  const navigate = useNavigate();
  const value = items?.find(({ id }) => id === currentItemId) ?? null;

  const showSaveConfirmation = useConfirmationModal({
    onConfirm: handleSaveNew,
    message: t('message.confirm-save-new'),
    title: t('heading.save-new'),
  });

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
          currentId={value?.id ?? 'new'}
          onClick={id => {
            if (currentItemId === 'new' && isDirty) {
              showSaveConfirmation();
            } else navigate(route.addPart(id).build());
          }}
          options={options}
          scrollRef={scrollRef}
        />
      </Box>
    </Tooltip>
  );
};
