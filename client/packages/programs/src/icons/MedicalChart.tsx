import React from 'react';
import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';
import { GradientStops } from './_gradient';

export const MedicalChartIcon = (props: SvgIconProps): JSX.Element => (
  <SvgIcon {...props} viewBox="0 0 60 60" fill="none">
    <path
      d="M34.6 32.8C34.6 33.5731 33.9738 34.2 33.2 34.2H31.8V35.6C31.8 36.3731 31.1738 37 30.4 37C29.6262 37 29 36.3731 29 35.6V34.2H27.6C26.8262 34.2 26.2 33.5731 26.2 32.8C26.2 32.0269 26.8262 31.4 27.6 31.4H29V30C29 29.2269 29.6262 28.6 30.4 28.6C31.1738 28.6 31.8 29.2269 31.8 30V31.4H33.2C33.9738 31.4 34.6 32.0269 34.6 32.8ZM37.4 11.8H41.6C43.916 11.8 45.8 13.684 45.8 16V46.8C45.8 49.116 43.916 51 41.6 51H19.2C16.884 51 15 49.116 15 46.8V16C15 13.684 16.884 11.8 19.2 11.8H23.4V18.8C23.4 19.5731 24.0262 20.2 24.8 20.2H36C36.7738 20.2 37.4 19.5731 37.4 18.8V11.8ZM37.4 32.8C37.4 28.9397 34.2596 25.8 30.4 25.8C26.5404 25.8 23.4 28.9397 23.4 32.8C23.4 36.6603 26.5404 39.8 30.4 39.8C34.2596 39.8 37.4 36.6603 37.4 32.8ZM33.2 11.8C33.2 10.2537 31.9463 9 30.4 9C28.8537 9 27.6 10.2537 27.6 11.8H26.2V17.4H34.6V11.8H33.2Z"
      fill="url(#paint0_linear_247_41400)"
    />
    <defs>
      <linearGradient
        id="paint0_linear_247_41400"
        x1="30.4"
        y1="9"
        x2="30.4"
        y2="51"
        gradientUnits="userSpaceOnUse"
      >
        <GradientStops />
      </linearGradient>
    </defs>
  </SvgIcon>
);
