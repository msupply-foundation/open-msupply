import React from 'react';
import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';
import { useTheme } from '@mui/material';

const getPaletteColour = (color?: string) => {
  switch (color) {
    case 'secondary':
      return 'secondary';
    default:
      return 'primary';
  }
};
export const BarChartIcon = ({ ...props }: SvgIconProps): JSX.Element => {
  const theme = useTheme();
  const colour = theme.palette[getPaletteColour(props.color)];

  return (
    <SvgIcon {...props} viewBox="0 0 125 46" strokeLinecap="round">
      <line
        x1="121"
        y1="2"
        x2="121"
        y2="46"
        stroke={colour.main}
        strokeWidth="4"
      ></line>
      <line
        x1="112"
        y1="6.5"
        x2="112"
        y2="46"
        stroke={colour.main}
        strokeWidth="4"
      ></line>
      <line
        x1="103.2"
        y1="0.5"
        x2="103.2"
        y2="46"
        stroke={colour.dark}
        strokeWidth="4"
      ></line>
      <line
        x1="94.2"
        y1="16"
        x2="94.2"
        y2="46"
        stroke={colour.main}
        strokeWidth="4"
      ></line>
      <line
        x1="85.3"
        y1="6.5"
        x2="85.3"
        y2="46"
        stroke={colour.main}
        strokeWidth="4"
      ></line>
      <line
        x1="76.6"
        y1="14"
        x2="76.6"
        y2="46"
        stroke={colour.main}
        strokeWidth="4"
      ></line>
      <line
        x1="67.7"
        y1="23"
        x2="67.7"
        y2="46"
        stroke="#ccddff"
        strokeWidth="4"
      ></line>
      <line
        x1="58.6"
        y1="19"
        x2="58.6"
        y2="46"
        stroke="#ccddff"
        strokeWidth="4"
      ></line>
      <line
        x1="49.7"
        y1="14"
        x2="49.7"
        y2="46"
        stroke="#ccddff"
        strokeWidth="4"
      ></line>
      <line
        x1="40.8"
        y1="23"
        x2="40.8"
        y2="46"
        stroke="#ccddff"
        strokeWidth="4"
      ></line>
      <line
        x1="31.9"
        y1="14"
        x2="31.9"
        y2="46"
        stroke="#ccddff"
        strokeWidth="4"
      ></line>
      <line
        x1="23"
        y1="30"
        x2="23"
        y2="46"
        stroke="#ccddff"
        strokeWidth="4"
      ></line>
      <line
        x1="14.2"
        y1="26.5"
        x2="14.2"
        y2="46"
        stroke="#ccddff"
        strokeWidth="4"
      ></line>
    </SvgIcon>
  );
};
