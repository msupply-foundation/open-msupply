import React from 'react';
import { Box } from '@mui/material';
import { ColorSelectButton } from '@common/components';
import { MRT_RowData } from 'material-react-table';

export const NameAndColorSetterCell = <
  T extends MRT_RowData & {
    id: string;
    otherPartyName: string;
    colour?: string | null;
  },
>({
  onColorChange,
  getIsDisabled,
  row,
  link,
}: {
  row: T;
  onColorChange: (patch: { id: string; colour: string }) => void;
  getIsDisabled?: (row: T) => boolean;
  link?: string;
}) => (
  <Box
    sx={{
      flexDirection: 'row',
      borderBottom: 'none',
      alignItems: 'center',
      display: 'flex',
      width: '100%',
    }}
  >
    <ColorSelectButton
      disabled={getIsDisabled?.(row) ?? false}
      onChange={color => onColorChange({ id: row.id, colour: color.hex })}
      color={row.colour}
    />
    <Box ml={1} />
    <Box
      component={link ? 'a' : 'div'}
      href={link}
      sx={{ textDecoration: 'none', color: 'inherit' }}
    >
      {row.otherPartyName}
    </Box>
  </Box>
);
