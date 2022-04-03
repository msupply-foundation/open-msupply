import React, { FC } from 'react';
import { Typography } from '@mui/material';

/*
Simple component for displaying numbers as text in a "form-like" layout
i.e. right-justified in a small fixed-width space
Can be used with Children <NumberTextDisplay>{value}</NumberTextDisplay>
or in "shorthand" style <NumberTextDislay value={value} />
*/

interface NumericTextDisplayProps {
  value?: string | number;
  children?: React.ReactElement<any, any>;
  width?: number;
}

export const NumericTextDisplay: FC<NumericTextDisplayProps> = ({
  value,
  children,
  width = 30,
}) => (
  <Typography style={{ width, textAlign: 'right' }}>
    {children ?? value != null ? value : ''}
  </Typography>
);
