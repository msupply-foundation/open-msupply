import React, { useCallback } from 'react';
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
  displayColumnKeys: string[];
  onChange: (columnKeys: string[]) => void;
}

export const ColumnPicker = <T extends RecordWithId>({
  columns,
  displayColumnKeys,
  onChange,
}: ColumnPickerProps<T>) => {
  const t = useTranslation();
  const [anchorEl, setAnchorEl] = React.useState<HTMLButtonElement | null>(
    null
  );

  const open = Boolean(anchorEl);
  const id = open ? 'simple-popover' : undefined;

  const isVisible = useCallback(
    (column: Column<T>) => displayColumnKeys.includes(String(column.key)),
    [displayColumnKeys]
  );

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const toggleColumn = (column: Column<T>) => {
    if (isVisible(column))
      onChange(displayColumnKeys.filter(key => key !== column.key));
    else onChange([...displayColumnKeys, String(column.key)]);
  };

  return (
    <>
      <Tooltip title={t('table.show-columns')}>
        <IconButton onClick={handleClick} aria-describedby={id}>
          <ColumnsIcon
            sx={{
              color:
                displayColumnKeys.length !== columns.length
                  ? 'secondary.main'
                  : undefined,
            }}
          />
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
