import React from 'react';
import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';

export const Medicine = (props: SvgIconProps): JSX.Element => {
  return (
    <SvgIcon {...props} viewBox="0 0 100 125">
      <path d="M67,28.9h-4.2v-4.4h7v-16H30.3v16h7v4.4H33c-5.5,0-10,4.5-10,10v46.6c0,5.5,4.5,10,10,10h34c5.5,0,10-4.5,10-10V38.9  C77,33.4,72.5,28.9,67,28.9z M34.3,20.5v-8h31.5v8h-3H37.3H34.3z M73,85.5c0,3.3-2.7,6-6,6H33c-3.3,0-6-2.7-6-6V38.9  c0-3.3,2.7-6,6-6h8.2v-8.4h17.5v8.4H67c3.3,0,6,2.7,6,6V85.5z" />
      <polygon points="46.8,69 53.3,69 53.3,62.1 60.1,62.1 60.1,55.6 53.3,55.6 53.3,48.7 46.8,48.7 46.8,55.6 39.9,55.6 39.9,62.1   46.8,62.1 " />
      <path d="M69.9,44.5H30.1V73h39.8V44.5z M67.9,71H32.1V46.5h35.8V71z" />
      <path d="M69.3,84.1c0,1.9-1.5,3.4-3.4,3.4H58v2h7.9c3,0,5.4-2.4,5.4-5.4v-9.1h-2V84.1z" />
    </SvgIcon>
  );
};
