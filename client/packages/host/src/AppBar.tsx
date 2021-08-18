import React, { useState } from 'react';
import {
  ArrowLeft,
  makeStyles,
  styled,
  Toolbar,
  Typography,
  useDrawer,
  useTranslation,
} from '@openmsupply-client/common';
import clsx from 'clsx';
import { LanguageMenu } from './LanguageMenu';
import { Link, useLocation } from 'react-router-dom';
import { LocaleKey } from '@openmsupply-client/common/src/intl/intlHelpers';

const Breadcrumb = styled(Link)({
  color: 'inherit',
  fontWeight: 'bold',
  textDecoration: 'none',
});

const ArrowIcon = styled(ArrowLeft)({
  marginRight: 8,
});

const H6 = styled(Typography)({
  flexGrow: 1,
});

const useStyles = makeStyles(theme => ({
  toolbar: {
    paddingRight: 24,
  },
  appBar: {
    left: 72,
    position: 'absolute',
    transition: theme.transitions.create(['width', 'margin'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    width: '100vw',
    zIndex: theme.zIndex.drawer - 1,
    height: 90,
    boxShadow: theme.shadows[1],
    ...theme.mixins.header,
  },
  appBarShift: {
    marginLeft: 128,
    transition: theme.transitions.create(['width', 'margin'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  },
}));

interface urlPart {
  path: string;
  key: LocaleKey;
  value: string;
}

const Breadcrumbs: React.FC = () => {
  const t = useTranslation();
  const location = useLocation();
  const [urlParts, setUrlParts] = useState<urlPart[]>([]);

  React.useEffect(() => {
    const parts = location.pathname.split('/');
    const urlParts: urlPart[] = [];

    parts.reduce((fullPath, part) => {
      if (part === '') return '';
      const path = `/${fullPath}/${part}`;
      urlParts.push({ path, key: `app.${part}` as LocaleKey, value: part });
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
      <span key={part.key}>
        <Breadcrumb to={part.path}>{t(part.key)}</Breadcrumb>
        {' / '}
      </span>
    );
  });

  return (
    <H6 variant="h6" color="inherit" noWrap>
      {crumbs}
    </H6>
  );
};

const AppBar: React.FC = () => {
  const classes = useStyles();
  const { isOpen } = useDrawer();

  return (
    <div className={clsx(classes.appBar, isOpen && classes.appBarShift)}>
      <Toolbar className={classes.toolbar}>
        <ArrowIcon />
        <Breadcrumbs />
        <LanguageMenu />
      </Toolbar>
    </div>
  );
};
export default AppBar;
