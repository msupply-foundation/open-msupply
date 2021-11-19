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
    RouteBuilder.create(AppRoute.Distribution).addWildCard().build()
  );
  const t = useTranslation('app');

  return (
    <>
      <NavLink
        end={false}
        to={AppRoute.Distribution}
        icon={<TruckIcon color="primary" fontSize="small" />}
        expandOnHover
        text={t('distribution')}
      />
      <Collapse in={isActive}>
        <List>
          <NavLink
            end
            expandOnHover
            to={RouteBuilder.create(AppRoute.Distribution)
              .addPart(AppRoute.OutboundShipment)
              .build()}
            text={t('outbound-shipment')}
          />
          <NavLink
            end
            expandOnHover
            to={RouteBuilder.create(AppRoute.Distribution)
              .addPart(AppRoute.CustomerRequisition)
              .build()}
            text={t('customer-requisition')}
          />
          <NavLink
            end
            expandOnHover
            to={RouteBuilder.create(AppRoute.Distribution)
              .addPart(AppRoute.InboundShipment)
              .build()}
            text={t('app.inbound-shipments')}
          />
          <NavLink
            end
            expandOnHover
            to={RouteBuilder.create(AppRoute.Distribution)
              .addPart(AppRoute.Customer)
              .build()}
            text={t('customers')}
          />
        </List>
      </Collapse>
    </>
  );
};

export default Nav;
