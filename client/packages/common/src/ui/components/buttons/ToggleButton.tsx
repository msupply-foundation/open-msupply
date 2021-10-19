import React, { FC } from 'react';
import MuiToggleButton, {
  ToggleButtonProps as MuiToggleButtonProps,
} from '@mui/material/ToggleButton';
import Typography from '@mui/material/Typography';
import { Checkbox } from '../inputs/Checkbox';
import { LocaleKey, LocaleProps, useTranslation } from '../../../intl';

interface ToggleButtonProps extends Omit<MuiToggleButtonProps, 'onClick'> {
  labelKey: LocaleKey;
  onClick: (event: React.MouseEvent<HTMLButtonElement>, value: unknown) => void;
  selected: boolean;
  labelProps?: LocaleProps;
}

export const ToggleButton: FC<ToggleButtonProps> = ({
  sx,
  labelKey,
  labelProps,
  selected,
  value,
  onClick,
  ...props
}) => {
  const t = useTranslation();
  const label = t(labelKey, labelProps);

  return (
    <MuiToggleButton
      {...props}
      selected={selected}
      value={value}
      onClick={e => onClick(e, value)}
      sx={{
        backgroundColor: 'white',
        '&.Mui-selected': { backgroundColor: 'white' },
        boxShadow: theme => theme.shadows[1],
        borderRadius: '24px',
        height: '40px',

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
};
