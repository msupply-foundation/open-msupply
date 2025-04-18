import React, { useEffect, useRef } from 'react';
import { styled } from '@mui/material/styles';
import { Breadcrumbs as MuiBreadcrumbs } from '@mui/material';
import { Link } from 'react-router-dom';
import { useRegisterActions, useBreadcrumbs } from '@openmsupply-client/common';
import { useTranslation } from '@common/intl';
import { UrlPart, useHostContext } from '@common/hooks';
import { AppRoute } from '@openmsupply-client/config';

export const Breadcrumb = styled(Link)({
  color: 'inherit',
  fontWeight: 'bold',
  textDecoration: 'none',
  '&:hover': { textDecoration: 'underline' },
});

export const Breadcrumbs = ({
  topLevelPaths = [AppRoute.Settings, AppRoute.Reports, AppRoute.Help],
}: {
  topLevelPaths?: string[];
}) => {
  const t = useTranslation();
  const { fullScreen } = useHostContext();
  const { urlParts, navigateUpOne, customBreadcrumbs } =
    useBreadcrumbs(topLevelPaths);

  // Use ref so `perform` function can access the latest value
  const fullScreenRef = useRef(fullScreen);
  useEffect(() => {
    fullScreenRef.current = fullScreen;
  }, [fullScreen]);

  useRegisterActions(
    [
      {
        id: 'navigation:up-one-level',
        name: '', // No name => won't show in Modal menu
        shortcut: ['escape'],
        keywords: 'navigate, back',
        perform: () => {
          // Escape should be used to exit full screen mode, otherwise navigate
          !fullScreenRef.current && navigateUpOne();
        },
      },
    ],
    [urlParts]
  );

  const parseTitle = (part: UrlPart) =>
    /^\d+$/.test(part.value)
      ? t('breadcrumb.item', { id: part.value })
      : t(part.key);

  const crumbs = urlParts.map((part, index) => {
    const customCrumb = customBreadcrumbs[index];

    const displayValue = customCrumb ?? parseTitle(part);

    const isLastPart = index === urlParts.length - 1;

    if (isLastPart || part.disabled) {
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
