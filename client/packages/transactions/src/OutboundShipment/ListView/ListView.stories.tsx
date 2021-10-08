import React from 'react';
import { Route } from 'react-router';
import { ComponentStory, ComponentMeta } from '@storybook/react';

// import { transactionList } from '@openmsupply-client/mocks';
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
    <TestingRouter initialEntries={['/customers/customer-invoice']}>
      <Route path="*" element={<OutboundShipmentListView {...args} />} />
    </TestingRouter>
  </TestingProvider>
);

export const Primary = Template.bind({});
Primary.parameters = {
  // msw: [transactionList],
};
