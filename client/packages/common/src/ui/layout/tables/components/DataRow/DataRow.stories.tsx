import React from 'react';
import { ComponentMeta, Story } from '@storybook/react';
import { TableBody, Table } from '@mui/material';
import { DataRow } from './DataRow';
import { useColumns } from '../../hooks';

export default {
  title: 'Table/DataRow',
  component: DataRow,
  argTypes: {
    backgroundColor: { control: 'color' },
  },
} as ComponentMeta<typeof DataRow>;

const Template: Story = ({ onClick, generateRowTooltip = () => '' }) => {
  const columns = useColumns<{ id: string; status: string; comment: string }>([
    'type',
    'status',
    'comment',
  ]);

  return (
    <Table>
      <TableBody>
        <DataRow
          columns={columns}
          rowKey="rowKey"
          rowIndex={0}
          rows={[]}
          rowData={{
            id: '',
            status: 'Finalised',
            comment: 'Supplier invoice',
          }}
          onClick={onClick}
          generateRowTooltip={generateRowTooltip}
        />
      </TableBody>
    </Table>
  );
};

export const Basic = Template.bind({});
Basic.args = {
  onClick: null,
};

export const WithRowClick = Template.bind({});
WithRowClick.args = {
  onClick: () => {},
};

export const WithTooltip = Template.bind({});
WithTooltip.args = {
  onClick: () => {},
  generateRowTooltip: (row: any) =>
    `This tooltip is not very helpful. It just says that the status is ${row.status}`,
};
