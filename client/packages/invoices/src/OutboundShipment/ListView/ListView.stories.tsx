import React from 'react';
import { Route } from 'react-router';
import { ComponentStory, ComponentMeta } from '@storybook/react';
import { handlers } from '@openmsupply-client/mock-server/src/worker/handlers';
import { TestingProvider, TestingRouter } from '@openmsupply-client/common';

import { OutboundShipmentListView } from './ListView';

export default {
  title: 'Page/OutboundShipmentListView',
  component: OutboundShipmentListView,
  argTypes: {
    backgroundColor: { control: 'color' },
  },
} as ComponentMeta<typeof OutboundShipmentListView>;

const Template: ComponentStory<typeof OutboundShipmentListView> = args => (
  <TestingProvider>
    <TestingRouter initialEntries={['/distribution/outbound-shipment']}>
      <Route path="*" element={<OutboundShipmentListView {...args} />} />
    </TestingRouter>
  </TestingProvider>
);

export const Primary = Template.bind({});
Primary.parameters = {
  msw: handlers,
};
