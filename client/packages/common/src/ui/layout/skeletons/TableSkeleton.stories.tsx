import React from 'react';
import { StoryFn, Meta } from '@storybook/react';

import { TableSkeleton } from './TableSkeleton';

export default {
  title: 'Skeleton/Table',
  component: TableSkeleton,
} as Meta<typeof TableSkeleton>;

const Template: StoryFn<typeof TableSkeleton> = args => (
  <TableSkeleton hasGroupBy={args.hasGroupBy} />
);

export const Primary = Template.bind({});
export const Grouped = Template.bind({});
Grouped.args = { hasGroupBy: true };
