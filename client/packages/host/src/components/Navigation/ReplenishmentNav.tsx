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

export const ReplenishmentNav: FC = () => {
  const { isActive } = useNestedNav(
    RouteBuilder.create(AppRoute.Replenishment).addWildCard().build()
  );
  const t = useTranslation('app');

  return (
    <>
      <NavLink
        end={false}
        to={AppRoute.Replenishment}
        icon={<TruckIcon color="primary" fontSize="small" />}
        expandOnHover
        text={t('replenishment')}
      />
      <Collapse in={isActive}>
        <List>
          <NavLink
            end
            expandOnHover
            to={RouteBuilder.create(AppRoute.Replenishment)
              .addPart(AppRoute.InboundShipment)
              .build()}
            text={t('inbound-shipment')}
          />
          <NavLink
            end
            expandOnHover
            to={RouteBuilder.create(AppRoute.Replenishment)
              .addPart(AppRoute.SupplierRequisition)
              .build()}
            text={t('supplier-requisition')}
          />

          <NavLink
            end
            expandOnHover
            to={RouteBuilder.create(AppRoute.Replenishment)
              .addPart(AppRoute.Suppliers)
              .build()}
            text={t('suppliers')}
          />
        </List>
      </Collapse>
    </>
  );
};
