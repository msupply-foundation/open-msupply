import React from 'react';
import { ComponentMeta, Story } from '@storybook/react';
import { TableBody, Table } from '@mui/material';
import { DataRow } from './DataRow';
import {
  ColumnDefinition,
  ColumnAlign,
  ColumnFormat,
} from '../../columns/types';
import { useColumns } from '../../hooks';
import { Transaction } from '../../../../../types';

export default {
  title: 'Table/DataRow',
  component: DataRow,
  argTypes: {
    backgroundColor: { control: 'color' },
  },
} as ComponentMeta<typeof DataRow>;

const exampleColumns: ColumnDefinition<Transaction>[] = [
  {
    label: 'label.type',
    key: 'type',
    width: 150,
  },
  {
    label: 'label.status',
    key: 'status',
    width: 100,
  },
  {
    label: 'label.entered',
    key: 'entered',
    format: ColumnFormat.date,
    width: 100,
  },
  {
    label: 'label.confirmed',
    key: 'confirmed',
    format: ColumnFormat.date,
    width: 100,
  },

  {
    label: 'label.invoice-number',
    key: 'invoiceNumber',
    width: 75,
  },
  {
    label: 'label.total',
    key: 'total',
    width: 75,
    align: ColumnAlign.Right,
  },
  {
    label: 'label.comment',
    key: 'comment',
    width: 150,
  },
];
const Template: Story = ({ onClick }) => {
  const columns = useColumns(exampleColumns);

  return (
    <Table>
      <TableBody>
        <DataRow
          columns={columns}
          rowKey="rowKey"
          rowData={{
            id: '',
            name: '',
            total: '',
            comment: '',
            color: 'grey',
            status: '',
            type: '',
            entered: '',
            confirmed: '',
            invoiceNumber: '',
          }}
          onClick={onClick}
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
