import React from 'react';
import { Args, Meta, StoryFn } from '@storybook/react';
import { TableBody, Table } from '@mui/material';
import { DataRow } from './DataRow';
import { useColumns } from '../../hooks';
import { useFormatDateTime, useTranslation } from '@common/intl';

export default {
  title: 'Table/DataRow',
  component: DataRow,
  argTypes: {
    backgroundColor: { control: 'color' },
  },
} as Meta<typeof DataRow>;

interface StoryRow {
  id: string;
  status?: string;
  comment?: string;
}

const Template: StoryFn = ({ onClick, generateRowTooltip = () => '' }) => {
  const t = useTranslation();
  const { localisedDate } = useFormatDateTime();
  const columns = useColumns<StoryRow>(['type', 'status', 'comment']);

  return (
    <Table>
      <TableBody>
        <DataRow
          columns={columns}
          rowKey="rowKey"
          rowIndex={0}
          rowData={
            {
              id: '',
              status: 'Finalised',
              comment: 'Supplier invoice',
            } as StoryRow
          }
          onClick={onClick}
          generateRowTooltip={generateRowTooltip}
          localisedText={t}
          localisedDate={localisedDate}
          isAnimated={false}
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
  generateRowTooltip: (row: Args) =>
    `This tooltip is not very helpful. It just says that the status is ${row['status']}`,
};
