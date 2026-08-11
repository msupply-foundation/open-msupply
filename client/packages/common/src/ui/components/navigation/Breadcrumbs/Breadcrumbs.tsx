import React, { useEffect, useMemo, useRef } from 'react';
import { styled } from '@mui/material/styles';
import { Breadcrumbs as MuiBreadcrumbs } from '@mui/material';
import { Link } from 'react-router-dom';
import {
  useRegisterActions,
  useBreadcrumbs,
  usePluginProvider,
} from '@openmsupply-client/common';
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
  const { plugins } = usePluginProvider();

  // Plugin category-root pages live at `/<categoryKey>` (no second segment),
  // which `useBreadcrumbs` would otherwise drop from `urlParts` because the
  // index-1 segment is only kept when it's in `topLevelPaths`. Merging the
  // plugin category keys in lets those URLs surface as a urlPart at index 0,
  // which `PluginBreadcrumbs` then maps its `customBreadcrumbs[0]` against.
  const pluginCategoryKeys = useMemo(
    () =>
      (plugins.pages ?? [])
        .filter(page => page.menu.category.type === 'new')
        .map(page =>
          page.menu.category.type === 'new' ? page.menu.category.key : ''
        ),
    [plugins.pages]
  );
  const allTopLevelPaths = useMemo(
    () => [...topLevelPaths, ...pluginCategoryKeys],
    [topLevelPaths, pluginCategoryKeys]
  );

  const { urlParts, navigateUpOne, customBreadcrumbs } =
    useBreadcrumbs(allTopLevelPaths);

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
      // MUI renders a <nav> but leaves it unnamed; the WAI-ARIA breadcrumb
      // pattern names the landmark so it's distinguishable from the app
      // drawer's <nav>. The deterministic e2e suites locate the breadcrumb
      // by this accessible name (open-msupply-frontend e2e/TESTIDS.md §
      // non-testid hooks).
      aria-label={t('label.breadcrumb')}
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
