import React from 'react';
import { Route } from 'react-router';
import { ComponentStory, ComponentMeta } from '@storybook/react';
// import { handlers } from '@openmsupply-client/mock-server/src/worker/handlers';
import { StoryProvider, TestingRouter } from '@openmsupply-client/common';

import { OutboundShipmentListView } from './ListView';

const handlers: any[] = [];

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
  msw: handlers,
};
