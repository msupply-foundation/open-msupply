import React from 'react';
import {
  ListOptions,
  RouteBuilder,
  useNavigate,
  useTranslation,
  useConfirmationModal,
  Box,
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

  const showSaveConfirmation = useConfirmationModal({
    onConfirm: handleSaveNew,
    message: t('message.confirm-save-new'),
    title: t('heading.save-new'),
  });

  let options =
    items?.map(({ id, name }) => ({
      id,
      value: name,
    })) ?? [];
  if (showNew) {
    options.push({ id: 'new', value: t('label.new-item') });
  }

  return (
      <Box sx={{ flexGrowY: 1, overflow: 'auto', scrollBehavior: 'smooth' }}>
        <ListOptions
          currentId={value?.id ?? 'new'}
          onClick={id => {
            if (currentItemId === 'new' && isDirty) {
              showSaveConfirmation();
            } else navigate(route.addPart(id).build());
          }}
          options={options}
          enteredLineIds={enteredLineIds}
          scrollRef={scrollRef}
        />
      </Box>
  );
};
