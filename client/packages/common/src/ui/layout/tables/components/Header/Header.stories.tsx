import React from 'react';
import { ComponentMeta, Story } from '@storybook/react';
import { Table, TableHead } from '@mui/material';
import { HeaderCell, HeaderRow } from './Header';
import { useSortBy } from '@common/hooks';
import { useColumns } from '../../hooks';
import { Item } from '@common/types';

export default {
  title: 'Table/HeaderRow',
  component: HeaderRow,
} as ComponentMeta<typeof HeaderRow>;

const Template: Story = () => {
  const { onChangeSortBy, sortBy } = useSortBy<Item>({ key: 'name' });

  const [column1, column2] = useColumns(
    ['name', 'packSize'],
    { onChangeSortBy, sortBy },
    [sortBy]
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
          <HeaderCell column={column1} />
          <HeaderCell column={column1} />
        </HeaderRow>
      </TableHead>
    </Table>
  );
};

export const Basic = Template.bind({});
