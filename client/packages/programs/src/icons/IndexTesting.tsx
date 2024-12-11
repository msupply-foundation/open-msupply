import React from 'react';
import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';
import { GradientStops } from './_gradient';

export const IndexTestingIcon = (props: SvgIconProps): JSX.Element => (
  <SvgIcon {...props} viewBox="0 0 60 60" fill="none">
    <path
      d="M26.375 37.4476V25.7576C26.3762 25.5481 26.3358 25.3405 26.2561 25.1468C26.1765 24.953 26.0593 24.777 25.9112 24.6289C25.763 24.4808 25.587 24.3635 25.3933 24.2839C25.1996 24.2043 24.992 24.1639 24.7825 24.1651H9.5925C9.17014 24.1651 8.76508 24.3328 8.46643 24.6315C8.16778 24.9301 8 25.3352 8 25.7576V37.4476C8.0023 37.8692 8.17082 38.2729 8.46897 38.5711C8.76713 38.8692 9.17085 39.0378 9.5925 39.0401H12.8387L23.2775 43.4151L21.6763 39.0401H24.7825C25.2049 39.0401 25.6099 38.8723 25.9086 38.5736C26.2072 38.275 26.375 37.8699 26.375 37.4476ZM17.4325 27.2538C17.7911 27.2538 18.1416 27.3603 18.4397 27.5597C18.7377 27.7591 18.9699 28.0425 19.1067 28.374C19.2435 28.7054 19.2789 29.0701 19.2083 29.4217C19.1377 29.7732 18.9643 30.096 18.7101 30.3489C18.4559 30.6019 18.1324 30.7737 17.7805 30.8426C17.4285 30.9115 17.0641 30.8743 16.7333 30.7359C16.4025 30.5975 16.1202 30.364 15.9222 30.065C15.7243 29.766 15.6195 29.4149 15.6213 29.0563C15.6212 28.8189 15.6682 28.5838 15.7593 28.3645C15.8504 28.1452 15.984 27.9461 16.1523 27.7787C16.3206 27.6112 16.5203 27.4786 16.74 27.3885C16.9597 27.2984 17.1951 27.2527 17.4325 27.2538ZM20.4338 36.3363H14.4488V35.1026C14.4903 34.3312 14.826 33.6051 15.3868 33.0738C15.9475 32.5424 16.6906 32.2463 17.4631 32.2463C18.2356 32.2463 18.9787 32.5424 19.5395 33.0738C20.1002 33.6051 20.4359 34.3312 20.4775 35.1026L20.4338 36.3363Z"
      fill="url(#paint0_linear_247_41524)"
    />
    <path
      d="M37.06 26.8075H42.625V14.75C42.625 14.2859 42.4406 13.8408 42.1124 13.5126C41.7842 13.1844 41.3391 13 40.875 13H26C25.5359 13 25.0908 13.1844 24.7626 13.5126C24.4344 13.8408 24.25 14.2859 24.25 14.75V23.29H24.6262C25.3224 23.29 25.9901 23.5666 26.4824 24.0588C26.9747 24.5511 27.2512 25.2188 27.2512 25.915V27.875H28.8612C29.0076 27.8765 29.148 27.9327 29.255 28.0325L33.2712 31.5325V29.4063C33.2733 28.9907 33.3596 28.5799 33.525 28.1988C34.1462 26.7113 35.7562 26.7638 37.06 26.8075ZM33.4462 15.4325C33.8048 15.4308 34.1559 15.5355 34.4549 15.7335C34.7539 15.9315 34.9874 16.2137 35.1259 16.5445C35.2643 16.8753 35.3014 17.2398 35.2325 17.5917C35.1636 17.9436 34.9918 18.2672 34.7388 18.5214C34.4859 18.7756 34.1632 18.9489 33.8116 19.0195C33.46 19.0901 33.0954 19.0548 32.7639 18.9179C32.4324 18.7811 32.149 18.549 31.9496 18.2509C31.7502 17.9529 31.6438 17.6024 31.6438 17.2438C31.6529 16.771 31.8465 16.3205 32.1833 15.9886C32.5201 15.6567 32.9734 15.4697 33.4462 15.4675V15.4325ZM30.4275 24.5325V23.325C30.4275 22.5267 30.7446 21.7611 31.3091 21.1966C31.8736 20.6321 32.6392 20.315 33.4375 20.315C34.2358 20.315 35.0014 20.6321 35.5659 21.1966C36.1304 21.7611 36.4475 22.5267 36.4475 23.325V24.5325H30.4275Z"
      fill="url(#paint1_linear_247_41524)"
    />
    <path
      d="M52.5117 29.2839C52.5117 28.8615 52.3439 28.4565 52.0453 28.1578C51.7466 27.8592 51.3416 27.6914 50.9192 27.6914H35.7292C35.3069 27.6914 34.9018 27.8592 34.6032 28.1578C34.3045 28.4565 34.1367 28.8615 34.1367 29.2839V40.9739C34.139 41.3956 34.3075 41.7993 34.6057 42.0974C34.9038 42.3956 35.3076 42.5641 35.7292 42.5664H38.8442L37.243 46.9414L47.848 42.5664H50.9192C51.3409 42.5641 51.7446 42.3956 52.0427 42.0974C52.3409 41.7993 52.5094 41.3956 52.5117 40.9739V29.2839ZM43.3242 30.0627C43.6848 30.0505 44.0408 30.1462 44.3466 30.3377C44.6524 30.5291 44.8941 30.8076 45.0406 31.1373C45.1871 31.467 45.2319 31.8329 45.1691 32.1882C45.1062 32.5435 44.9387 32.8719 44.6881 33.1314C44.4374 33.3909 44.1149 33.5696 43.762 33.6446C43.409 33.7196 43.0418 33.6874 42.7072 33.5523C42.3727 33.4172 42.0861 33.1853 41.8842 32.8863C41.6824 32.5872 41.5744 32.2347 41.5742 31.8739C41.5739 31.404 41.7563 30.9523 42.0829 30.6143C42.4094 30.2764 42.8545 30.0786 43.3242 30.0627ZM46.3255 39.1189H40.3142V37.9202C40.3142 37.1219 40.6313 36.3562 41.1958 35.7918C41.7603 35.2273 42.5259 34.9102 43.3242 34.9102C44.1225 34.9102 44.8881 35.2273 45.4526 35.7918C46.0171 36.3562 46.3342 37.1219 46.3342 37.9202L46.3255 39.1189Z"
      fill="url(#paint2_linear_247_41524)"
    />
    <defs>
      <linearGradient
        id="paint0_linear_247_41524"
        x1="17.1875"
        y1="24.165"
        x2="17.1875"
        y2="43.4151"
        gradientUnits="userSpaceOnUse"
      >
        <GradientStops />
      </linearGradient>
      <linearGradient
        id="paint1_linear_247_41524"
        x1="33.4375"
        y1="13"
        x2="33.4375"
        y2="31.5325"
        gradientUnits="userSpaceOnUse"
      >
        <GradientStops />
      </linearGradient>
      <linearGradient
        id="paint2_linear_247_41524"
        x1="43.3242"
        y1="27.6914"
        x2="43.3242"
        y2="46.9414"
        gradientUnits="userSpaceOnUse"
      >
        <GradientStops />
      </linearGradient>
    </defs>
  </SvgIcon>
);