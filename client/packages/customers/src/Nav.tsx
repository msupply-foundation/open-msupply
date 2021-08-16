import React, { FC, useEffect } from 'react';
import { useMatch } from 'react-router-dom';
import {
  Customers,
  Collapse,
  List,
  useDrawer,
  AppNavLink,
  useTranslation,
} from '@openmsupply-client/common';

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
  const { isActive } = useNestedNav('customer/*');
  const t = useTranslation();
  return (
    <>
      <AppNavLink
        to="customers"
        icon={<Customers />}
        text={t('app.customers')}
      />
      <Collapse in={isActive}>
        <List>
          <AppNavLink
            end={true}
            to="/customers/customer-invoice"
            text={t('app.customer-invoice')}
          />
          <AppNavLink
            end={true}
            to="/customers/customer-requisition"
            text={t('app.customer-requisition')}
          />
        </List>
      </Collapse>
    </>
  );
};

export default Nav;
