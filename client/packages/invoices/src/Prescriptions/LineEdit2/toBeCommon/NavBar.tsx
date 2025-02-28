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
  const currentIndex = itemIds.findIndex(item => item === currentItemId);
  const hasPrevious = currentIndex > 0;

  const totalCount = itemIds.length;
  const currentCount = currentIndex + 1;

  const creatingNew = currentItemId === 'new';
  const hasNext =
    currentCount < itemIds.length || (canCreateNew && !creatingNew);

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
