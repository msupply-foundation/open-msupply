import React from 'react';
import { ComponentStory, ComponentMeta } from '@storybook/react';

import { DataTableSkeleton } from './DataTableSkeleton';

export default {
  title: 'Skeleton/DataTable',
  component: DataTableSkeleton,
} as ComponentMeta<typeof DataTableSkeleton>;

const Template: ComponentStory<typeof DataTableSkeleton> = args => (
  <DataTableSkeleton hasGroupBy={args.hasGroupBy} />
);

export const Primary = Template.bind({});
export const Grouped = Template.bind({});
Grouped.args = { hasGroupBy: true };
