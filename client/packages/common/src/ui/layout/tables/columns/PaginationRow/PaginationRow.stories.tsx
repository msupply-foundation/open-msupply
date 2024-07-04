import React from 'react';
import { StoryFn, Meta } from '@storybook/react';

import { PaginationRow } from './PaginationRow';

export default {
  title: 'Table/PaginationRow',
  component: PaginationRow,
  argTypes: {
    backgroundColor: { control: 'color' },
  },
} as Meta<typeof PaginationRow>;

const Template: StoryFn<typeof PaginationRow> = args => (
  <PaginationRow {...args} />
);

export const Standard = Template.bind({});
Standard.args = {
  offset: 0,
  first: 10,
  total: 1000,
  onChange: (page: number) => alert(`The page returned is: ${page}`),
};

export const WithLotsOfPages = Template.bind({});
WithLotsOfPages.args = {
  offset: 0,
  first: 10,
  total: 100000,
  onChange: (page: number) => alert(`The page returned is: ${page}`),
};

export const WithNoPages = Template.bind({});
WithNoPages.args = {
  offset: 0,
  first: 10,
  total: 0,
  onChange: (page: number) => alert(`The page returned is: ${page}`),
};
