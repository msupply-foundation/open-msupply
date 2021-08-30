import { GlobalStyles } from '@material-ui/core';
import React, { FC } from 'react';
import { useRtl } from '../intl/intlHelpers';

export const AppGlobalStyles: FC = props => {
  const isRtl = useRtl();

  return (
    <GlobalStyles
      styles={{
        body: { direction: isRtl ? 'rtl' : 'ltr' },
        '*:-webkit-full-screen': {
          height: '100%',
          width: '100%',
        },
        '#root': {
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        },
        html: { position: 'fixed' },
        'html, body': {
          height: '100%',
          width: '100%',
        },
      }}
      {...props}
    />
  );
};
