import React, { FC, useEffect } from 'react';
import { useMatch } from 'react-router-dom';
import {
  Customers,
  Collapse,
  List,
  useDrawer,
  AppNavLink,
  useFormatMessage,
} from '@openmsupply-client/common';

const useNestedNav = (path: string) => {
  const { open } = useDrawer();
  const match = useMatch(path);
  const [expanded, setExpanded] = React.useState(false);

  useEffect(() => {
    setExpanded(!!match);
  }, [match]);

  return { isActive: open && expanded };
};

const Nav: FC = () => {
  const { isActive } = useNestedNav('customer/*');
  const formatMessage = useFormatMessage();
  return (
    <>
      <AppNavLink
        to="customers"
        icon={<Customers />}
        text={formatMessage('app.customers')}
      />
      <Collapse in={isActive}>
        <List>
          <AppNavLink
            end={true}
            to="/customers/customer-invoice"
            text={formatMessage('app.customer_invoices')}
          />
          <AppNavLink
            end={true}
            to="/customers/customer-requisition"
            text="Requisitions"
          />
        </List>
      </Collapse>
    </>
  );
};

export default Nav;
