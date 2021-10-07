import React from 'react';
import { ComponentMeta, Story } from '@storybook/react';
import { Table, TableHead } from '@mui/material';
import { HeaderCell, HeaderRow } from './Header';
import { useSortBy } from '../../../../../hooks/useSortBy';
import { useColumns } from '../../hooks';
import { ColumnSetBuilder } from '../../utils';
import { Item } from '../../../../../types';

export default {
  title: 'Table/HeaderRow',
  component: HeaderRow,
} as ComponentMeta<typeof HeaderRow>;

const Template: Story = () => {
  const { sortBy, onChangeSortBy } = useSortBy<Item>({ key: 'name' });

  const [column1, column2] = useColumns(
    new ColumnSetBuilder<Item>()
      .addColumn('name')
      .addColumn('packSize')
      .build(),
    { onChangeSortBy }
  );

  if (!column1 || !column2) return <></>;

  return (
    <Table
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <TableHead>
        <HeaderRow>
          <HeaderCell sortBy={sortBy} column={column1}>
            Header1
          </HeaderCell>
          <HeaderCell sortBy={sortBy} column={column1}>
            Header2
          </HeaderCell>
        </HeaderRow>
      </TableHead>
    </Table>
  );
};

export const Basic = Template.bind({});
