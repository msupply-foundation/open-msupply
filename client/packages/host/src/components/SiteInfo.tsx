import React, { FC } from 'react';
import {
  ArrowLeftIcon,
  ButtonWithIcon,
  frontEndHostUrl,
  useNativeClient,
} from '@openmsupply-client/common';

export const SiteInfo: FC<{ siteName?: string | null }> = ({ siteName }) => {
  const { connectedServer, goBackToDiscovery } = useNativeClient();

  if (!connectedServer) return null;

  return (
    <ButtonWithIcon
      label={`${siteName || ''} ${frontEndHostUrl(connectedServer)}`}
      Icon={<ArrowLeftIcon />}
      onClick={goBackToDiscovery}
    />
  );
};
