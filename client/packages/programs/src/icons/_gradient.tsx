// Returns common gradient stop points used in all Programs icons

import React from 'react';
import { useTheme } from '@common/styles';

export const GradientStops = () => {
  const theme = useTheme();
  return (
    <>
      <stop stopColor={theme.palette.programs.iconGradientStart} />
      <stop offset="1" stopColor={theme.palette.programs.iconGradientStop} />
    </>
  );
};
