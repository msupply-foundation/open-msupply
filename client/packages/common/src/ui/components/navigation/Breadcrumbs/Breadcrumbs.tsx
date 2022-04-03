import React from 'react';
import { styled } from '@mui/material/styles';
import { Breadcrumbs as MuiBreadcrumbs } from '@mui/material';
import { Link } from 'react-router-dom';
import { useRegisterActions, useBreadcrumbs } from '@openmsupply-client/common';
import { useTranslation } from '@common/intl';
import { UrlPart } from '@common/hooks';

const Breadcrumb = styled(Link)({
  color: 'inherit',
  fontWeight: 'bold',
  textDecoration: 'none',
});

export const Breadcrumbs: React.FC = () => {
  const t = useTranslation('app');
  const { urlParts, navigateUpOne, suffix } = useBreadcrumbs();

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

  const parseTitle = (part: UrlPart) =>
    /^\d+$/.test(part.value)
      ? t('breadcrumb.item', { id: part.value })
      : t(part.key);

  const crumbs = urlParts.map((part, index) => {
    if (index === urlParts.length - 1) {
      return <span key={part.key}>{suffix ?? parseTitle(part)}</span>;
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
