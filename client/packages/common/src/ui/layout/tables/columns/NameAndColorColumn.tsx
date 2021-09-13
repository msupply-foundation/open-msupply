import React, { useState } from 'react';
import { CellProps, Column } from 'react-table';
import { Color, ColorMenu, UnstyledIconButton } from '../../../components';
import { Circle } from '../../../icons';
import { Box } from '@material-ui/system';

type Colorable = {
  color: string;
} & Record<string, unknown>;

export const getNameAndColorColumn = <T extends Colorable>(
  onChange: (row: T, color: Color) => void
): Column<T> => ({
  id: 'color',
  align: 'left',

  Cell: ({ row, value }: CellProps<T>) => {
    const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
      setAnchorEl(null);
    };

    return (
      <Box
        sx={{
          flexDirection: 'row',
          borderBottom: 'none',
          alignItems: 'center',
          display: 'flex',
        }}
      >
        <ColorMenu
          onClose={handleClose}
          anchorEl={anchorEl}
          onClick={color => {
            handleClose();
            onChange(row.original, color);
          }}
        />
        <UnstyledIconButton
          titleKey="button.select-a-color"
          icon={
            <Circle
              htmlColor={row.original.color}
              sx={{
                width: '12px',
                margin: 'margin: 0 9px 0 10px',
                overflow: 'visible',
                cursor: 'pointer',
              }}
            />
          }
          onClick={e => {
            e.stopPropagation();
            handleClick(e);
          }}
        />
        <Box ml={1} />
        {value}
      </Box>
    );
  },
});
