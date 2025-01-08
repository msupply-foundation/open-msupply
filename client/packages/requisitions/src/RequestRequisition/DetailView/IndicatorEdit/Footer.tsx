import React from 'react';
import { Box, AppFooterPortal, DialogButton } from '@openmsupply-client/common';
import { IndicatorLineRowFragment } from '../../api';
import { useIndicatorNavigation } from './hooks';

interface FooterProps {
  hasNext: boolean;
  next: IndicatorLineRowFragment | null;
  hasPrevious: boolean;
  previous: IndicatorLineRowFragment | null;
  requisitionNumber?: number;
}

export const Footer = ({
  hasNext,
  next,
  hasPrevious,
  previous,
  requisitionNumber,
}: FooterProps) => {
  const navigateTo = useIndicatorNavigation(requisitionNumber);
  const navigateToNext = () => navigateTo(next?.id);
  const navigateToPrevious = () => navigateTo(previous?.id);

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
