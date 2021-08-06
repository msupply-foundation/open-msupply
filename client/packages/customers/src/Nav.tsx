import React, { FC, useEffect } from 'react';
import { useMatch } from 'react-router-dom';
import {
  Customers,
  Collapse,
  List,
  useDrawer,
  AppNavLink,
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

  return (
    <>
      <AppNavLink to="customers" icon={<Customers />} text="Customers" />
      <Collapse in={isActive}>
        <List>
          <AppNavLink
            to="/customers/customer-invoice"
            icon={<span style={{ width: 20 }} />}
            text="Customer Invoices"
          />
        </List>
      </Collapse>
    </>
  );
};

export default Nav;
