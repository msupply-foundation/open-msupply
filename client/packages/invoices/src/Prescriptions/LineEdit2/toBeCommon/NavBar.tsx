import {
  ArrowLeftIcon,
  ArrowRightIcon,
  Box,
  ButtonWithIcon,
  Typography,
  useTranslation,
} from '@openmsupply-client/common';
import React from 'react';

interface NavBarProps {
  itemIds: string[];
  currentItemId: string;
  setItem: (itemId: string) => void;
  scrollIntoView: () => void;
  canCreateNew?: boolean;
}

export const NavBar: React.FC<NavBarProps> = ({
  itemIds,
  currentItemId,
  setItem,
  scrollIntoView,
  canCreateNew = false,
}) => {
  const t = useTranslation();

  const totalCount = itemIds.length;

  if (canCreateNew) itemIds.push('new');

  const currentIndex = itemIds.findIndex(item => item === currentItemId);
  const hasPrevious = currentIndex > 0;

  const currentCount = currentIndex + 1;
  const nextIsNew = currentCount === totalCount && canCreateNew;
  const hasNext = currentCount < totalCount || nextIsNew;

  const creatingNew = currentItemId === 'new';

  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="space-between"
      sx={{ marginTop: 2, marginBottom: 3 }}
    >
      <ButtonWithIcon
        label={t('button.previous')}
        Icon={<ArrowLeftIcon />}
        disabled={!hasPrevious}
        onClick={() => {
          setItem(itemIds[currentIndex - 1] ?? '');
          scrollIntoView();
        }}
      />
      <Typography>{!creatingNew && `${currentCount}/${totalCount}`}</Typography>
      <ButtonWithIcon
        label={t('button.next')}
        Icon={<ArrowRightIcon />}
        disabled={!hasNext}
        onClick={() => {
          setItem(itemIds[currentIndex + 1] ?? '');
          scrollIntoView();
        }}
      />
    </Box>
  );
};
