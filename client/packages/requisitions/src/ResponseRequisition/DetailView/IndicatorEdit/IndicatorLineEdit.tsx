import React from 'react';
import { Footer } from './Footer';
import { Box } from '@openmsupply-client/common';
import { IndicatorLineRowFragment, ProgramIndicatorFragment } from '../../api';

interface IndicatorLineEditProps {
  requisitionNumber: number;
  indicatorCode?: string;
  hasNext: boolean;
  next: IndicatorLineRowFragment | null;
  hasPrevious: boolean;
  previous: IndicatorLineRowFragment | null;
  indicators?: ProgramIndicatorFragment[];
}

export const IndicatorLineEdit = ({
  requisitionNumber,
  hasNext,
  next,
  hasPrevious,
  previous,
}: IndicatorLineEditProps) => {
  return (
    <>
      <Box>hi</Box>
      <Box>
        <Footer
          hasNext={hasNext}
          next={next}
          hasPrevious={hasPrevious}
          previous={previous}
          requisitionNumber={requisitionNumber}
        />
      </Box>
    </>
  );
};
