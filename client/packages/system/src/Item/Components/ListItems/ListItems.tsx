import React from 'react';
import {
  ListOptions,
  RouteBuilder,
  useNavigate,
  useTranslation,
  useConfirmationModal,
  Box,
  ALT_KEY,
  useRegisterActions,
} from '@openmsupply-client/common';
import { ItemRowFragment } from '../../api';

interface ListItemProps {
  currentItemId?: string | null;
  items: ItemRowFragment[];
  route: RouteBuilder;
  enteredLineIds?: string[];
  isDirty?: boolean;
  showNew?: boolean;
  handleSaveNew?: () => void;
  scrollRef: React.MutableRefObject<HTMLLIElement | null>;
}

export const ListItems = ({
  currentItemId,
  items,
  route,
  enteredLineIds,
  showNew = false,
  isDirty = false,
  handleSaveNew = () => {},
  scrollRef,
}: ListItemProps) => {
  const t = useTranslation();
  const navigate = useNavigate();
  const value = items?.find(({ id }) => id === currentItemId) ?? null;

  const showSaveNewConfirmation = useConfirmationModal({
    onConfirm: handleSaveNew,
    message: t('message.confirm-save-new'),
    title: t('heading.save-new'),
  });

  const options =
    items?.map(({ id, name }) => ({
      id,
      value: name,
    })) ?? [];
  if (showNew) {
    options.push({ id: 'new', value: t('label.new-item') });
  }

  const changeItem = (id: string) => {
    if (currentItemId === 'new' && isDirty) {
      showSaveNewConfirmation();
    } else navigate(route.addPart(id).build());
  };

  useRegisterActions(
    [
      {
        id: 'new-prescription-item',
        name: `${t('label.new-item')} (${ALT_KEY}+N)`,
        shortcut: ['Alt+KeyN'],
        perform: () => showNew && changeItem('new'),
      },
    ],
    [route, showNew, currentItemId, isDirty]
  );

  return (
    <Box sx={{ flexGrowY: 1, overflow: 'auto', scrollBehavior: 'smooth' }}>
      <ListOptions
        currentId={value?.id ?? 'new'}
        onClick={changeItem}
        options={options}
        enteredLineIds={enteredLineIds}
        scrollRef={scrollRef}
      />
    </Box>
  );
};
