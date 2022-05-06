import React, { useState } from 'react';
import { ComponentMeta, Story } from '@storybook/react';
import { Table, TableHead } from '@mui/material';
import { HeaderCell, HeaderRow } from './Header';
import { useColumns } from '../../hooks';
import { SortBy } from '@common/hooks';
import { Column } from '../../columns';

export default {
  title: 'Table/HeaderRow',
  component: HeaderRow,
} as ComponentMeta<typeof HeaderRow>;

type Test = {
  id: string;
  name: string;
  packSize: number;
};

const Template: Story = () => {
  const [sortBy, setSortBy] = useState<SortBy<Test>>({
    key: 'name',
    isDesc: false,
    direction: 'asc',
  });

  const getDirection = (isDesc: boolean): 'asc' | 'desc' =>
    isDesc ? 'desc' : 'asc';

  const onChangeSortBy = (column: Column<Test>) => {
    let newSortBy = sortBy;
    setSortBy(({ key: prevSortKey, isDesc: prevIsDesc = false }) => {
      const { key: newSortKey, sortBy: { isDesc: maybeNewIsDesc } = {} } =
        column;
      const newIsDesc =
        prevSortKey === newSortKey ? !prevIsDesc : !!maybeNewIsDesc ?? false;
      newSortBy = {
        key: newSortKey,
        isDesc: newIsDesc,
        direction: getDirection(newIsDesc),
      };
      return newSortBy;
    });
    return { ...newSortBy, direction: getDirection(!!newSortBy?.isDesc) };
  };

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
