import React from 'react';
import { styled } from '@mui/material/styles';
import { Breadcrumbs as MuiBreadcrumbs } from '@mui/material';
import { Link } from 'react-router-dom';
import { useRegisterActions, useBreadcrumbs } from '@openmsupply-client/common';
import { useTranslation } from '@common/intl';

const Breadcrumb = styled(Link)({
  color: 'inherit',
  fontWeight: 'bold',
  textDecoration: 'none',
});

export const Breadcrumbs: React.FC = () => {
  const t = useTranslation(['app', 'common']);
  const { urlParts, navigateUpOne } = useBreadcrumbs();

  useRegisterActions(
    [
      {
        id: 'navigation:up-one-level',
        name: '', // No name => won't show in Modal menu
        shortcut: ['escape'],
        keywords: 'navigate, back',
        perform: () => navigateUpOne(),
      },
    ],
    [urlParts]
  );

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
