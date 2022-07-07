import React from 'react';
import {
  IconButton,
  Tooltip,
  Popover,
  Stack,
  Typography,
  FormControlLabel,
} from '@mui/material';
import {
  Checkbox,
  Column,
  ColumnsIcon,
  RecordWithId,
} from '@openmsupply-client/common';
import { LocaleKey, useTranslation } from '@common/intl';

export interface ColumnPickerProps<T extends RecordWithId> {
  columns: Column<T>[];
}

export const ColumnPicker = <T extends RecordWithId>({
  columns,
}: ColumnPickerProps<T>) => {
  const t = useTranslation('common');
  const [anchorEl, setAnchorEl] = React.useState<HTMLButtonElement | null>(
    null
  );

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);
  const id = open ? 'simple-popover' : undefined;
  const columnList = columns
    .filter(column => !!column.label)
    .map(column => ({
      enabled: true,
      label: column.label,
      key: column.key,
    }));

  return (
    <>
      <Tooltip title={t('table.show-columns')}>
        <IconButton onClick={handleClick} aria-describedby={id}>
          <ColumnsIcon sx={{ color: 'secondary.main' }} />
        </IconButton>
      </Tooltip>
      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'center',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <Stack spacing={1} padding={2}>
          <Typography style={{ fontWeight: 700 }}>
            {t('table.show-columns')}
          </Typography>
          {columnList.map(column => (
            <FormControlLabel
              key={String(column.key)}
              control={<Checkbox checked={column.enabled} />}
              label={t(column.label as LocaleKey)}
            />
          ))}
        </Stack>
      </Popover>
    </>
  );
};
