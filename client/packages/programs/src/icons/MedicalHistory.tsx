import React from 'react';
import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';
import { GradientStops } from './_gradient';

export const MedicalHistoryIcon = (props: SvgIconProps): JSX.Element => (
  <SvgIcon {...props} viewBox="0 0 60 60" fill="none">
    <path
      d="M14.6111 11C12.6168 11 11 12.6168 11 14.6111V26.5729C11.735 25.8835 12.7673 25.4444 13.8889 25.4444V21.1111C13.8889 19.9145 14.8589 18.9444 16.0556 18.9444H44.9444C46.1411 18.9444 47.1111 19.9145 47.1111 21.1111V21.8333C48.174 21.8333 49.2021 22.0556 50 22.6698V18.9444C50 16.9501 48.3832 15.3333 46.3889 15.3333H31.912C30.4998 15.3333 29.0827 13.4665 27.7592 12.2103C27.1238 11.6071 26.4969 11 25.6208 11H14.6111Z"
      fill="url(#paint0_linear_247_41355)"
    />
    <path
      d="M34.8333 23.2777C33.9572 23.2777 33.3303 23.8849 32.6949 24.488C31.3714 25.7442 30.5002 26.8888 29.088 26.8888H13.8889C11.8945 26.8888 11 28.5056 11 30.4999V44.9444C11 46.9387 12.6168 48.5555 14.6111 48.5555H46.3889C48.3832 48.5555 50 46.9387 50 44.9444V26.1666C50 24.1722 49.1055 23.2777 47.1111 23.2777H34.8333ZM28.3333 31.2222H32.6667V35.5555H37V39.8888H32.6667V44.2222H28.3333V39.8888H24V35.5555H28.3333V31.2222Z"
      fill="url(#paint1_linear_247_41355)"
    />
    <defs>
      <linearGradient
        id="paint0_linear_247_41355"
        x1="30.5"
        y1="11"
        x2="30.5"
        y2="26.5729"
        gradientUnits="userSpaceOnUse"
      >
        <GradientStops />
      </linearGradient>
      <linearGradient
        id="paint1_linear_247_41355"
        x1="30.5"
        y1="23.2777"
        x2="30.5"
        y2="48.5555"
        gradientUnits="userSpaceOnUse"
      >
        <GradientStops />
      </linearGradient>
    </defs>
  </SvgIcon>
);
