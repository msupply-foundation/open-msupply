import React from 'react';
import { Box, DialogButton } from '@openmsupply-client/common';
import { IndicatorLineRowFragment } from '../../RequestRequisition/api';

interface FooterProps {
  hasNext: boolean;
  next: IndicatorLineRowFragment | null;
  hasPrevious: boolean;
  previous: IndicatorLineRowFragment | null;
  onSelectLine: (id: string) => void;
  scrollIntoView: () => void;
}

export const Footer = ({
  hasNext,
  next,
  hasPrevious,
  previous,
  onSelectLine,
  scrollIntoView,
}: FooterProps) => {
  const navigateToNext = () => {
    if (next?.id) onSelectLine(next.id);
    scrollIntoView();
  };
  const navigateToPrevious = () => {
    if (previous?.id) onSelectLine(previous.id);
    scrollIntoView();
  };

  return (
    <Box
      gap={2}
      display="flex"
      flexDirection="row"
      alignItems="center"
      paddingY={1}
      justifyContent="flex-end"
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
  );
};
