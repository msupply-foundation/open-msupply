import React, { FC, useEffect } from 'react';
import { useMatch } from 'react-router-dom';
import {
  Customers,
  Collapse,
  Invoice,
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
            to="/customers/customer-invoice"
            icon={<Invoice />}
            text={formatMessage('app.customer_invoices')}
          />
          <AppNavLink
            to="/customers/customer-requisition"
            icon={<Invoice />}
            text="Requisitions"
          />
        </List>
      </Collapse>
    </>
  );
};

export default Nav;
