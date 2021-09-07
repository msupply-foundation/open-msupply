import React from 'react';
import { ComponentMeta, Story } from '@storybook/react';
import { Route } from 'react-router-dom';

import { Breadcrumbs } from './Breadcrumbs';
import { TestingProvider, TestingRouter } from '../../../../utils/testing';
import { Box } from '@material-ui/system';
import { RouteBuilder } from '../../../..';
import { AppRoute } from '@openmsupply-client/config';

export default {
  title: 'Components/Breadcrumbs',
  component: Breadcrumbs,
} as ComponentMeta<typeof Breadcrumbs>;

const Template: Story<{ initialEntries: string[] }> = ({ initialEntries }) => {
  return (
    <TestingProvider>
      <TestingRouter initialEntries={initialEntries}>
        <Route
          path="*"
          element={
            <Box>
              <Breadcrumbs />
            </Box>
          }
        ></Route>
      </TestingRouter>
    </TestingProvider>
  );
};

export const Short = Template.bind({});
Short.args = {
  initialEntries: [RouteBuilder.create(AppRoute.Customers).build()],
};

export const Medium = Template.bind({});
Medium.args = {
  initialEntries: [
    RouteBuilder.create(AppRoute.Customers)
      .addPart(AppRoute.CustomerInvoice)
      .addPart('3')
      .build(),
  ],
};

export const TooLong = Template.bind({});
TooLong.args = {
  initialEntries: [
    RouteBuilder.create(AppRoute.Customers)
      .addPart(AppRoute.CustomerInvoice)
      .addPart(AppRoute.Customers)
      .addPart(AppRoute.CustomerInvoice)
      .addPart(AppRoute.Customers)
      .addPart(AppRoute.CustomerInvoice)
      .addPart(AppRoute.Customers)
      .addPart(AppRoute.CustomerInvoice)
      .addPart(AppRoute.Customers)
      .addPart(AppRoute.CustomerInvoice)
      .addPart(AppRoute.Customers)
      .addPart(AppRoute.CustomerInvoice)
      .addPart(AppRoute.Customers)
      .addPart(AppRoute.CustomerInvoice)
      .addPart(AppRoute.Customers)
      .addPart(AppRoute.CustomerInvoice)
      .addPart(AppRoute.Customers)
      .addPart(AppRoute.CustomerInvoice)
      .addPart('3')
      .build(),
  ],
};
