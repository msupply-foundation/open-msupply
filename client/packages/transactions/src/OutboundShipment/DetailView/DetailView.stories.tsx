import React from 'react';
import { Route } from 'react-router';

import { ComponentStory, ComponentMeta } from '@storybook/react';
import { TestingProvider, TestingRouter } from '@openmsupply-client/common';
// import { transactionList, transactionDetail } from '@openmsupply-client/mocks';

import { OutboundShipmentDetailView } from './DetailView';

export default {
  title: 'Page/OutboundShipmentDetailView',
  component: OutboundShipmentDetailView,
  argTypes: {
    backgroundColor: { control: 'color' },
  },
} as ComponentMeta<typeof OutboundShipmentDetailView>;

const Template: ComponentStory<typeof OutboundShipmentDetailView> = args => (
  <TestingProvider>
    <TestingRouter initialEntries={['/customers/customer-invoice/3']}>
      <Route path="/customers/customer-invoice">
        <Route path=":id" element={<OutboundShipmentDetailView {...args} />} />
      </Route>
    </TestingRouter>
  </TestingProvider>
);

export const Primary = Template.bind({});
Primary.parameters = {
  // msw: [transactionList, transactionDetail],
};
