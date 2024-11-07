import React from 'react';
import { Box } from '@openmsupply-client/common';

interface NewValueBarProps {
  value: number;
  total: number;
  colour: string;
}

export const NewValueBar = ({ value, total, colour }: NewValueBarProps) => {
  if (value === 0) return null;

  const flexBasis = Math.min(Math.round((100 * value) / total), 100);

  return (
    <>
      <Box flexBasis={`${flexBasis}%`} flexGrow={1}>
        <Box sx={{ backgroundColor: colour, height: '20px' }}></Box>
        <Box
          style={{
            paddingRight: 10,
            paddingTop: 10,
          }}
        ></Box>
      </Box>
    </>
  );
};
