import React, { useEffect } from 'react';
import { Story, ComponentMeta } from '@storybook/react';

import { Footer } from './Footer';
import { TestingProvider } from '@openmsupply-client/common/src/utils/testing';
import { useHostContext } from '@openmsupply-client/common/src/hooks/useHostContext';

export default {
  title: 'Host/Footer',
  component: Footer,
} as ComponentMeta<typeof Footer>;

const Template: Story<{ user: string; store: string }> = args => {
  const { setStore, setUser } = useHostContext();
  const { user, store } = args;

  useEffect(() => {
    setStore({ id: store, name: store });
    setUser({ id: user, name: user });
  }, []);

  return (
    <TestingProvider locale="en">
      <Footer />
    </TestingProvider>
  );
};

export const Administrator = Template.bind({});
export const Mark = Template.bind({});

Administrator.args = { store: 'Central Store', user: 'Administrator' };
Mark.args = { store: 'Some Remote Clinic', user: 'Mark' };
