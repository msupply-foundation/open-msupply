import React, { FC, useEffect } from 'react';
import { useMatch } from 'react-router-dom';
import {
  Customers,
  Collapse,
  List,
  useDrawer,
  useTranslation,
  RouteBuilder,
} from '@openmsupply-client/common';
import { AppNavLink } from '@openmsupply-client/common/src/ui/components/NavLink';
import { AppRoute } from '@openmsupply-client/config';

const useNestedNav = (path: string) => {
  const { isOpen } = useDrawer();
  const match = useMatch(path);
  const [expanded, setExpanded] = React.useState(false);

  useEffect(() => {
    setExpanded(!!match);
  }, [match]);

  return { isActive: isOpen && expanded };
};

const Nav: FC = () => {
  const { isActive } = useNestedNav(
    RouteBuilder.create(AppRoute.Customers).addWildCard().build()
  );
  const t = useTranslation();
  return (
    <>
      <AppNavLink
        end={!isActive}
        to={AppRoute.Customers}
        icon={<Customers />}
        text={t('app.customers')}
      />
      <Collapse in={isActive}>
        <List>
          <AppNavLink
            end={true}
            to={RouteBuilder.create(AppRoute.Customers)
              .addPart(AppRoute.CustomerInvoice)
              .build()}
            text={t('app.customer-invoice')}
          />
          <AppNavLink
            end={true}
            to={RouteBuilder.create(AppRoute.Customers)
              .addPart(AppRoute.CustomerRequisition)
              .build()}
            text={t('app.customer-requisition')}
          />
        </List>
      </Collapse>
    </>
  );
};

export default Nav;
