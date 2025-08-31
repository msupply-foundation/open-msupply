/**
 * TO-DO: Make this a generic re-useable component (in "common"), and update
 * styling to match new designs
 */

import {
  ArrowLeftIcon,
  ArrowRightIcon,
  Box,
  ButtonWithIcon,
  EnvUtils,
  Typography,
  useRegisterActions,
  useTranslation,
} from '@openmsupply-client/common';
import React from 'react';

interface NavBarProps {
  items: string[];
  currentItem: string;
  setItem: (itemId: string) => void;
  scrollIntoView: () => void;
}

export const NavBar = ({
  items,
  currentItem,
  setItem,
  scrollIntoView,
}: NavBarProps) => {
  const t = useTranslation();
  const currentIndex = items.findIndex(item => item === currentItem);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < items.length - 1;

  // To-do: generalise rather than have hard-coded "new"
  const totalCount =
    items.slice(-1)[0] === 'new' ? items.length - 1 : items.length;

  const onClick = () => {
    setItem(items[currentIndex + 1] ?? '');
    scrollIntoView();
  };

  const currentCount = currentIndex + 1;

  const altOrOptionString = EnvUtils.os === 'Mac OS' ? 'Option' : 'Alt';

  useRegisterActions([
    {
      id: 'next',
      name: `${t('button.next')} (${altOrOptionString}+N)`,
      shortcut: ['Alt+KeyN'],
      perform: onClick,
    },
  ]);

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
          setItem(items[currentIndex - 1] ?? '');
          scrollIntoView();
        }}
      />
      <Typography>
        {/* Only display when not "NEW" item */}
        {currentCount <= totalCount && `${currentCount}/${totalCount}`}
      </Typography>
      <ButtonWithIcon
        label={t('button.next')}
        Icon={<ArrowRightIcon />}
        disabled={!hasNext}
        onClick={onClick}
      />
    </Box>
  );
};
