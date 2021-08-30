import React, { FC } from 'react';
import { useRtl } from '../intl/intlHelpers';

export const RTLProvider: FC = props => {
  const isRtl = useRtl();

  return <div style={{ direction: isRtl ? 'rtl' : 'ltr' }} {...props} />;
};
