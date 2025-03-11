import { ExternalNavLink, Typography } from '@common/components';
import { useTranslation } from '@common/intl';
import { EnvUtils } from '@common/utils';
import { ExternalURL, useExternalUrl } from '@openmsupply-client/config';
import { useLocation } from '@openmsupply-client/common';

import React from 'react';

export const UserGuide = () => {
  const location = useLocation();
  const t = useTranslation();
  const publicDocsUrl = useExternalUrl(ExternalURL.PublicDocs);
  const docsUrl = `${publicDocsUrl}${
    EnvUtils.mapRoute(location.pathname).docs
  }`;

  return (
    <>
      <Typography variant="h5" style={{ paddingBottom: 10 }}>
        {t('heading.user-guide')}
      </Typography>
      <ExternalNavLink
        to={docsUrl}
        text={t('label.user-guide')}
        trustedSite={true}
      />
    </>
  );
};
