import React, { FC, useEffect } from 'react';
import { useMatch } from 'react-router-dom';
import {
  TruckIcon,
  Collapse,
  List,
  useDrawer,
  useTranslation,
  RouteBuilder,
  NavLink,
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
  const t = useTranslation();

  return (
    <>
      <NavLink
        end={false}
        to={AppRoute.Catalogue}
        icon={<TruckIcon color="primary" fontSize="small" />}
        expandOnHover
        text={t('app.catalogue')}
      />
      <Collapse in={isActive}>
        <List>
          <NavLink
            end
            expandOnHover
            to={RouteBuilder.create(AppRoute.Catalogue)
              .addPart(AppRoute.Items)
              .build()}
            text={t('app.items')}
          />
        </List>
      </Collapse>
    </>
  );
};

export default Nav;
