import React, { FC } from 'react';
import { useRtl } from '@common/intl';

export const RTLProvider: FC = props => {
  const isRtl = useRtl();

  React.useLayoutEffect(() => {
    document.body.setAttribute('dir', isRtl ? 'rtl' : 'ltr');
  }, [isRtl]);

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
