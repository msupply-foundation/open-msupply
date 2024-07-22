import React, { useState } from 'react';
import { Meta, StoryFn } from '@storybook/react';
import { Table, TableHead } from '@mui/material';
import { HeaderCell, HeaderRow } from './Header';
import { useColumns } from '../../hooks';
import { SortBy } from '@common/hooks';

export default {
  title: 'Table/HeaderRow',
  component: HeaderRow,
} as Meta<typeof HeaderRow>;

type Test = {
  id: string;
  name: string;
  packSize: number;
};

const Template: StoryFn = () => {
  const [sortBy, setSortBy] = useState<SortBy<Test>>({
    key: 'name',
    isDesc: false,
    direction: 'asc',
  });

  const getDirection = (isDesc: boolean): 'asc' | 'desc' =>
    isDesc ? 'desc' : 'asc';

  const onChangeSortBy = (newSortKey: string, dir: 'desc' | 'asc') => {
    let newSortBy = sortBy;
    setSortBy(() => {
      const newIsDesc = dir === 'desc';
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
          <HeaderCell column={column2} />
        </HeaderRow>
      </TableHead>
    </Table>
  );
};

export const Basic = Template.bind({});
