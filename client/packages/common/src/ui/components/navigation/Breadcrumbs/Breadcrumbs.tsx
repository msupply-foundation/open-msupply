import React from 'react';
import { styled } from '@mui/material/styles';
import { Breadcrumbs as MuiBreadcrumbs } from '@mui/material';
import { Link } from 'react-router-dom';
import { useRegisterActions, useBreadcrumbs } from '@openmsupply-client/common';
import { useTranslation } from '@common/intl';
import { UrlPart } from '@common/hooks';
import { AppRoute } from '@openmsupply-client/config';

export const Breadcrumb = styled(Link)({
  color: 'inherit',
  fontWeight: 'bold',
  textDecoration: 'none',
  '&:hover': { textDecoration: 'underline' },
});

export const Breadcrumbs = ({
  topLevelPaths = [AppRoute.Settings, AppRoute.Sync],
}: {
  topLevelPaths?: string[];
}) => {
  const t = useTranslation('app');
  const { urlParts, navigateUpOne, suffix, renderers } =
    useBreadcrumbs(topLevelPaths);

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
    const customRenderer = renderers[index];

    const displayValue = customRenderer
      ? customRenderer(part)
      : parseTitle(part);

    const isLastPart = index === urlParts.length - 1;
    if (isLastPart) {
      switch (true) {
        case !suffix:
          return <span key={part.key}>{displayValue}</span>;
        case typeof suffix === 'string':
          return <span key={part.key}>{suffix}</span>;
        default:
          return suffix;
      }
    }

    if (part.disabled) {
      return <span key={part.key}>{displayValue}</span>;
    }

    return (
      <Breadcrumb to={part.path} key={part.key}>
        {displayValue}
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
