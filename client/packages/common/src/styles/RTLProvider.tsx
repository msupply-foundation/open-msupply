import React, { FC } from 'react';
import { IntlUtils } from '@common/intl';

export const RTLProvider: FC = props => {
  const isRtl = IntlUtils.useRtl();

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
