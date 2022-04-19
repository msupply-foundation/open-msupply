import React, { FC } from 'react';
import MuiToggleButton, {
  ToggleButtonProps as MuiToggleButtonProps,
} from '@mui/material/ToggleButton';
import Typography from '@mui/material/Typography';
import { Checkbox } from '../../inputs/Checkbox';

interface ToggleButtonProps extends Omit<MuiToggleButtonProps, 'onClick'> {
  label: string;
  onClick: (event: React.MouseEvent<HTMLElement>, value: unknown) => void;
  selected: boolean;
}

export const ToggleButton: FC<ToggleButtonProps> = ({
  sx,
  label,
  selected,
  value,
  onClick,
  ...props
}) => (
  <MuiToggleButton
    {...props}
    selected={selected}
    value={value}
    onClick={e => onClick(e, value)}
    sx={{
      backgroundColor: 'white',
      '&.Mui-selected': { backgroundColor: 'white' },
      '& .MuiSvgIcon-root': { width: '15px', height: '15px' },
      boxShadow: theme => theme.shadows[1],
      borderRadius: '24px',
      height: '40px',
      justifyContent: 'center',

      // The intention of this padding is for giving a bit of extra space on the
      // right hand side of the typography as an offset for the checkbox, keeping
      // everything looking centred.
      paddingRight: '20px',
      textTransform: 'none',
      ...sx,
    }}
  >
    <Checkbox
      onClick={e => {
        e.stopPropagation();
        onClick(e, value);
      }}
      checked={selected}
    />
    <Typography variant="body2">{label}</Typography>
  </MuiToggleButton>
);
