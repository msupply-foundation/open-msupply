import React, { useState, useEffect } from 'react';
import { styled } from '@mui/material/styles';
import { Breadcrumbs as MuiBreadcrumbs } from '@mui/material';
import { useLocation, Link } from 'react-router-dom';

import { LocaleKey, useTranslation } from '@common/intl';

interface UrlPart {
  path: string;
  key: LocaleKey;
  value: string;
}

const Breadcrumb = styled(Link)({
  color: 'inherit',
  fontWeight: 'bold',
  textDecoration: 'none',
});

export const Breadcrumbs: React.FC = () => {
  const t = useTranslation(['app', 'common']);
  const location = useLocation();
  const [urlParts, setUrlParts] = useState<UrlPart[]>([]);

  useEffect(() => {
    const parts = location.pathname.split('/');
    const urlParts: UrlPart[] = [];

    parts.reduce((fullPath, part, index) => {
      if (part === '') return '';
      const path = `${fullPath}/${part}`;

      if (index > 1)
        urlParts.push({
          path,
          key: `${part}` as unknown as LocaleKey,
          value: part,
        });
      return path;
    }, '');
    setUrlParts(urlParts);
  }, [location]);

  const crumbs = urlParts.map((part, index) => {
    if (index === urlParts.length - 1) {
      const title = /^\d+$/.test(part.value)
        ? t('breadcrumb.item', { id: part.value })
        : t(part.key);

      return <span key={part.key}>{title}</span>;
    }

    return (
      <Breadcrumb to={part.path} key={part.key}>
        {t(part.key)}
      </Breadcrumb>
    );
  });

  return (
    <MuiBreadcrumbs
      sx={{
        fontSize: '16px',
        color: theme => theme.typography.body1.color,
        fontWeight: 500,
      }}
    >
      {crumbs}
    </MuiBreadcrumbs>
  );
};
