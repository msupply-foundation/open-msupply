import React from 'react';
import { ComponentMeta, Story } from '@storybook/react';
import { TableBody, Table } from '@material-ui/core';
import { DataRow } from './DataRow';

export default {
  title: 'Components/Table/DataRow',
  component: DataRow,
  argTypes: {
    backgroundColor: { control: 'color' },
  },
} as ComponentMeta<typeof DataRow>;

const cells = [
  {
    render: () => <span>11</span>,
    getCellProps: () => ({ key: Math.random() * 20 }),
  },
  {
    render: () => <span>General Warehouse</span>,
    getCellProps: () => ({ key: Math.random() * 20 }),
  },
  {
    render: () => <span>All items: General warehouse</span>,
    getCellProps: () => ({ key: Math.random() * 20 }),
  },
  {
    render: () => <span>52</span>,
    getCellProps: () => ({ key: Math.random() * 20 }),
  },
  {
    render: () => <span>25 Nov 2020</span>,
    getCellProps: () => ({ key: Math.random() * 20 }),
  },
  {
    render: () => <span>In Progress</span>,
    getCellProps: () => ({ key: Math.random() * 20 }),
  },
] as any;

const Template: Story = ({ onClick }) => (
  <Table>
    <TableBody>
      <DataRow cells={cells} values={{ id: 'josh' }} onClick={onClick} />
    </TableBody>
  </Table>
);

export const Basic = Template.bind({});

export const WithRowClick = Template.bind({});
WithRowClick.args = {
  onClick: () => {},
};
