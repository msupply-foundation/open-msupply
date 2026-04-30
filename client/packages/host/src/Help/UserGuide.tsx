import React from 'react';
import { ExternalNavLink, Typography } from '@common/components';
import { useTranslation } from '@common/intl';
import { ExternalURL, useExternalUrl } from '@openmsupply-client/config';

export const UserGuide = () => {
  const t = useTranslation();
  const publicDocsUrl = useExternalUrl(ExternalURL.PublicDocs);
  const docsUrl = `${publicDocsUrl}/introduction/introduction`;

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
