import React from 'react';
import { Box, AppFooterPortal, DialogButton } from '@openmsupply-client/common';
import { IndicatorLineRowFragment } from '../../api';
import { useIndicatorNavigation } from './hooks';

interface FooterProps {
  hasNext: boolean;
  next: IndicatorLineRowFragment | null;
  hasPrevious: boolean;
  previous: IndicatorLineRowFragment | null;
  requisitionId?: string;
  scrollIntoView: () => void;
}

export const Footer = ({
  hasNext,
  next,
  hasPrevious,
  previous,
  requisitionId,
  scrollIntoView,
}: FooterProps) => {
  const navigateTo = useIndicatorNavigation(requisitionId);
  const navigateToNext = () => {
    navigateTo(next?.id);
    scrollIntoView();
  };
  const navigateToPrevious = () => {
    navigateTo(previous?.id);
    scrollIntoView();
  };

  return (
    <AppFooterPortal
      Content={
        <Box
          gap={2}
          display="flex"
          flexDirection="row"
          alignItems="center"
          height={64}
        >
          <Box
            flex={1}
            display="flex"
            justifyContent="flex-end"
            gap={2}
            marginLeft="auto"
          >
            <DialogButton
              variant="previous"
              disabled={!hasPrevious}
              onClick={navigateToPrevious}
            />
            <DialogButton
              variant="next"
              disabled={!hasNext}
              onClick={navigateToNext}
            />
          </Box>
        </Box>
      }
    />
  );
};
