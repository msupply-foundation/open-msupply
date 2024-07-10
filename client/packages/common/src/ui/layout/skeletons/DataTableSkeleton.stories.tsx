import React from 'react';
import { StoryFn, Meta } from '@storybook/react';

import { DataTableSkeleton } from './DataTableSkeleton';

export default {
  title: 'Skeleton/DataTable',
  component: DataTableSkeleton,
} as Meta<typeof DataTableSkeleton>;

const Template: StoryFn<typeof DataTableSkeleton> = args => (
  <DataTableSkeleton hasGroupBy={args.hasGroupBy} />
);

export const Primary = Template.bind({});
export const Grouped = Template.bind({});
Grouped.args = { hasGroupBy: true };
