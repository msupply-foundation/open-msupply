import { ExternalNavLink } from '@common/components';
import { useTranslation } from '@common/intl';
import { EnvUtils } from '@common/utils';
import { ExternalURL, useExternalUrl } from 'packages/config/src';
import { useLocation } from '@openmsupply-client/common';

import React from 'react';

export const UserGuide: React.FC = () => {
  const location = useLocation();
  const t = useTranslation();
  const publicDocsUrl = useExternalUrl(ExternalURL.PublicDocs);
  const docsUrl = `${publicDocsUrl}${
    EnvUtils.mapRoute(location.pathname).docs
  }`;

  return (
    <>
      <ExternalNavLink
        to={docsUrl}
        text={t('label.user-guide')}
        trustedSite={true}
      />
    </>
  );
};
