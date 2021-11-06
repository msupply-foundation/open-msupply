import React from 'react';
import { Color } from '../../../components';
import { Box } from '@mui/system';
import { DomainObject } from '../../../../types';
import { ColumnDefinition } from '../columns/types';
import { ColorSelectButton } from '../../../components/buttons';

interface DomainObjectWithRequiredFields extends DomainObject {
  color: string;
  otherPartyName: string;
}

export const getNameAndColorColumn = <T extends DomainObjectWithRequiredFields>(
  onChange: (row: T, color: Color) => void
): ColumnDefinition<T> => ({
  label: 'label.name',
  width: 350,
  accessor: (rowData: T) => rowData.otherPartyName,
  key: 'otherPartyName',
  Cell: ({ rowData, column }) => (
    <Box
      sx={{
        flexDirection: 'row',
        borderBottom: 'none',
        alignItems: 'center',
        display: 'flex',
      }}
    >
      <ColorSelectButton
        onChange={color => onChange(rowData, color)}
        color={rowData.color}
      />
      <Box ml={1} />
      {column.accessor(rowData)}
    </Box>
  ),
});
