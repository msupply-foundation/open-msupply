import React from 'react';
import { Route } from 'react-router';
import { ComponentStory, ComponentMeta } from '@storybook/react';

import {
  StoryProvider,
  TestingRouter,
  mockInvoicesQuery,
} from '@openmsupply-client/common';

import { OutboundShipmentListView } from './ListView';

const invoicesQuery = mockInvoicesQuery((_, res, ctx) => {
  return res(
    ctx.data({
      invoices: {
        __typename: 'InvoiceConnector',
        totalCount: 0,
        nodes: [],
      },
    })
  );
});

export default {
  title: 'Page/OutboundShipmentListView',
  component: OutboundShipmentListView,
  argTypes: {
    backgroundColor: { control: 'color' },
  },
} as ComponentMeta<typeof OutboundShipmentListView>;

const Template: ComponentStory<typeof OutboundShipmentListView> = args => (
  <StoryProvider>
    <TestingRouter initialEntries={['/distribution/outbound-shipment']}>
      <Route path="*" element={<OutboundShipmentListView {...args} />} />
    </TestingRouter>
  </StoryProvider>
);

export const Primary = Template.bind({});
Primary.parameters = {
  msw: [invoicesQuery],
};
