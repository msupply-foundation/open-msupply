import React from 'react';
import { Route } from 'react-router';

import { ComponentStory, ComponentMeta } from '@storybook/react';
import { TestingProvider, TestingRouter } from '@openmsupply-client/common';
import { handlers } from '@openmsupply-client/mock-server/src/worker/handlers';

import { DetailView } from './DetailView';

export default {
  title: 'Page/OutboundShipmentDetailView',
  component: DetailView,
  argTypes: {
    backgroundColor: { control: 'color' },
  },
} as ComponentMeta<typeof DetailView>;

const Template: ComponentStory<typeof DetailView> = args => (
  <TestingProvider>
    <TestingRouter initialEntries={['/distribution/outbound-shipment/3']}>
      <Route path="/distribution/outbound-shipment">
        <Route path=":id" element={<DetailView {...args} />} />
      </Route>
    </TestingRouter>
  </TestingProvider>
);

export const Primary = Template.bind({});
Primary.parameters = {
  msw: handlers,
};
