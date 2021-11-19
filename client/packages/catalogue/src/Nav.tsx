import React, { FC, useEffect } from 'react';
import { useMatch } from 'react-router-dom';
import {
  Collapse,
  List,
  useDrawer,
  useTranslation,
  RouteBuilder,
  NavLink,
  ListIcon,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';

const matchPath = (key: string, path: string) =>
  `/${key.replace(/^\//, '')}/`.startsWith(path.replace(/\*$/, ''));

const useNestedNav = (path: string) => {
  const { hoverActive, isOpen } = useDrawer();
  const match = useMatch(path);
  const [expanded, setExpanded] = React.useState(false);
  const hovered = Object.keys(hoverActive).some(
    key => matchPath(key, path) && hoverActive[key]
  );

  useEffect(() => {
    setExpanded(!!match);
  }, [match]);

  return { isActive: isOpen && (expanded || hovered) };
};

const Nav: FC = () => {
  const { isActive } = useNestedNav(
    RouteBuilder.create(AppRoute.Catalogue).addWildCard().build()
  );
  const t = useTranslation('app');

  return (
    <>
      <NavLink
        end={false}
        to={AppRoute.Catalogue}
        icon={<ListIcon color="primary" />}
        expandOnHover
        text={t('catalogue')}
      />
      <Collapse in={isActive}>
        <List>
          <NavLink
            end
            expandOnHover
            to={RouteBuilder.create(AppRoute.Catalogue)
              .addPart(AppRoute.Items)
              .build()}
            text={t('items')}
          />
        </List>
      </Collapse>
    </>
  );
};

export default Nav;
