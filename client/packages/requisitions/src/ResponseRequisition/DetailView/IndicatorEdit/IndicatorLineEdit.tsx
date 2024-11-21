import React from 'react';
import { Footer } from './Footer';
import { Box } from '@openmsupply-client/common';
import { IndicatorLineRowFragment } from '../../api';

interface IndicatorLineEditProps {
  requisitionNumber: number;
  indicatorCode?: string;
  hasNext: boolean;
  next: IndicatorLineRowFragment | null;
  hasPrevious: boolean;
  previous: IndicatorLineRowFragment | null;
}

export const IndicatorLineEdit = ({
  requisitionNumber,
  hasNext,
  next,
  hasPrevious,
  previous,
}: IndicatorLineEditProps) => {
  return (
    <Box>
      <Footer
        hasNext={hasNext}
        next={next}
        hasPrevious={hasPrevious}
        previous={previous}
        requisitionNumber={requisitionNumber}
      />
    </Box>
  );
};
