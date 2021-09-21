import React from 'react';
import { ComponentMeta, Story } from '@storybook/react';
import { Table, TableHead } from '@mui/material';
import { HeaderCell, HeaderRow } from './Header';
import { useSortBy } from '../../../../../hooks/useSortBy';

export default {
  title: 'Table/HeaderRow',
  component: HeaderRow,
} as ComponentMeta<typeof HeaderRow>;

const Template: Story = () => {
  const { sortBy, onChangeSortBy } = useSortBy({ key: 'id' });
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
          <HeaderCell
            style={{ flex: 100, width: 100, maxWidth: 100, minWidth: 100 }}
            onSortBy={onChangeSortBy}
            isSortable
            isSorted={sortBy.key === 'id'}
            id="id"
            direction={sortBy.direction}
          >
            Header1
          </HeaderCell>
          <HeaderCell
            style={{ flex: 100, width: 100, maxWidth: 100, minWidth: 100 }}
            isSortable={false}
            id="quantity"
          >
            Header2
          </HeaderCell>
        </HeaderRow>
      </TableHead>
    </Table>
  );
};

export const Basic = Template.bind({});
