import React, { FC } from 'react';
import { useRtl } from '../intl/intlHelpers';

export const RTLProvider: FC = props => {
  const isRtl = useRtl();

  return (
    <div
      style={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        flexDirection: 'column',
        direction: isRtl ? 'rtl' : 'ltr',
      }}
      {...props}
    />
  );
};
