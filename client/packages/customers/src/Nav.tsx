import React, { FC, useEffect } from 'react';
import { useMatch } from 'react-router-dom';
import {
  Customers,
  Collapse,
  List,
  useDrawer,
  useTranslation,
  RouteBuilder,
  NavLink,
} from '@openmsupply-client/common';
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
      <NavLink
        end={!isActive}
        to={AppRoute.Customers}
        icon={<Customers fontSize="small" />}
        text={t('app.customers')}
      />
      <Collapse in={isActive}>
        <List>
          <NavLink
            end={true}
            to={RouteBuilder.create(AppRoute.Customers)
              .addPart(AppRoute.CustomerInvoice)
              .build()}
            text={t('app.customer-invoice')}
          />
          <NavLink
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
