import React, { FC } from 'react';
import { useIntlUtils } from '@common/intl';
import { PropsWithChildrenOnly } from '@common/types';

export const RTLProvider: FC<PropsWithChildrenOnly> = props => {
  const { isRtl } = useIntlUtils();

  return (
    <div
      style={{
        height: '100%',
        width: '100vw',
        display: 'flex',
        flexDirection: 'column',
        direction: isRtl ? 'rtl' : 'ltr',
      }}
      {...props}
    />
  );
};
