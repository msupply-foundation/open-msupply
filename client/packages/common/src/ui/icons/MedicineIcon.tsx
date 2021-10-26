import React from 'react';
import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';

export const MedicineIcon = (props: SvgIconProps): JSX.Element => {
  return (
    <SvgIcon {...props} viewBox="0 0 64 64">
      <path d="M33,34H30V31a2,2,0,0,0-4,0v3H23a2,2,0,0,0,0,4h3v3a2,2,0,0,0,4,0V38h3a2,2,0,0,0,0-4Z" />
      <path d="M39,4H26a4,4,0,0,0-4,4v7.07A8,8,0,0,0,15,23V51a8,8,0,0,0,8,8H42a8,8,0,0,0,8-8V23a8,8,0,0,0-7-7.93V8A4,4,0,0,0,39,4ZM26,8H39v7H26ZM19,27H38V45H19Zm27-4V51a4,4,0,0,1-4,4H23a4,4,0,0,1-4-4V49H38a4,4,0,0,0,4-4V27a4,4,0,0,0-4-4H19a4,4,0,0,1,4-4H42A4,4,0,0,1,46,23Z" />
    </SvgIcon>
  );
};
