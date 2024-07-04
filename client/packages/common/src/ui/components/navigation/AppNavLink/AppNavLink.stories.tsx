import React, { FC, useEffect } from 'react';
import { Meta, StoryFn } from '@storybook/react';
import { Route } from 'react-router-dom';
import { Box } from '@mui/material';
import { AppNavLink, AppNavLinkProps } from './AppNavLink';
import { StoryProvider, TestingRouter } from '../../../../utils/testing';
import { TruckIcon } from '@common/icons';
import { useDrawer } from '@common/hooks';

export default {
  title: 'Components/AppNavLink',
  component: AppNavLink,
} as Meta<typeof AppNavLink>;

const Wrapper: FC<{ collapsed: boolean }> = ({ collapsed }) => {
  const drawer = useDrawer();

  useEffect(() => {
    if (collapsed) drawer.close();
    else drawer.open();
  }, []);

  return null;
};

const Template: StoryFn<AppNavLinkProps & { collapsed: boolean }> = args => {
  return (
    <StoryProvider>
      <TestingRouter initialEntries={['/distribution']}>
        <Route
          path="*"
          element={
            <Box>
              <Wrapper collapsed={args.collapsed} />
              <AppNavLink {...args} />
            </Box>
          }
        ></Route>
      </TestingRouter>
    </StoryProvider>
  );
};

export const Collapsed = Template.bind({});
Collapsed.args = {
  end: false,
  text: 'Distribution',
  icon: <TruckIcon />,
  to: 'outbound-shipments',
  collapsed: true,
};

export const Expanded = Template.bind({});
Expanded.args = {
  end: false,
  text: 'Distribution',
  icon: <TruckIcon />,
  to: 'outbound-shipments',
  collapsed: false,
};
