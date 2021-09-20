import React, { FC, useEffect } from 'react';
import { ComponentMeta, Story } from '@storybook/react';
import { Route } from 'react-router-dom';

import { NavLink, NavLinkProps } from './NavLink';
import { TestingProvider, TestingRouter } from '../../../../utils/testing';
import { Customers } from '../../../icons';
import { useDrawer } from '../../../../hooks';
import { Box } from '@mui/system';

export default {
  title: 'Components/NavLink',
  component: NavLink,
} as ComponentMeta<typeof NavLink>;

const Wrapper: FC<{ collapsed: boolean }> = ({ collapsed }) => {
  const drawer = useDrawer();

  useEffect(() => {
    if (collapsed) drawer.close();
    else drawer.open();
  }, []);

  return null;
};

const Template: Story<NavLinkProps & { collapsed: boolean }> = args => {
  return (
    <TestingProvider>
      <TestingRouter initialEntries={['/customers']}>
        <Route
          path="*"
          element={
            <Box>
              <Wrapper collapsed={args.collapsed} />
              <NavLink {...args} />
            </Box>
          }
        ></Route>
      </TestingRouter>
    </TestingProvider>
  );
};

export const Collapsed = Template.bind({});
Collapsed.args = {
  end: false,
  text: 'Customers',
  icon: <Customers />,
  to: 'outbound-shipments',
  collapsed: true,
};

export const Expanded = Template.bind({});
Expanded.args = {
  end: false,
  text: 'Customers',
  icon: <Customers />,
  to: 'outbound-shipments',
  collapsed: false,
};
