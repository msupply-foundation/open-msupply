import React, { useEffect, useState } from 'react';
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

interface ColumnPickerProps<T extends RecordWithId> {
  columns: Column<T>[];
  onChange: (columns: Column<T>[]) => void;
}

export const ColumnPicker = <T extends RecordWithId>({
  columns,
  onChange,
}: ColumnPickerProps<T>) => {
  const t = useTranslation('common');
  const [anchorEl, setAnchorEl] = React.useState<HTMLButtonElement | null>(
    null
  );
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
  const isVisible = (column: Column<T>) =>
    !hiddenColumns.includes(String(column.key));

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);
  const id = open ? 'simple-popover' : undefined;
  const toggleColumn = (column: Column<T>) => {
    const updatedColumns = isVisible(column)
      ? [...hiddenColumns, String(column.key)]
      : hiddenColumns.filter(key => key !== column.key);

    setHiddenColumns(updatedColumns);
  };

  useEffect(() => onChange(columns.filter(isVisible)), [hiddenColumns]);

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
          {Object.values(columns)
            .filter(c => !!c.label)
            .map(column => (
              <FormControlLabel
                key={String(column.key)}
                checked={isVisible(column)}
                control={<Checkbox onClick={() => toggleColumn(column)} />}
                label={t(column.label as LocaleKey)}
              />
            ))}
        </Stack>
      </Popover>
    </>
  );
};
