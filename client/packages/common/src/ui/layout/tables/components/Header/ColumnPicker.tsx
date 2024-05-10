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

interface ColumnPickerProps<T extends RecordWithId> {
  columns: Column<T>[];
  columnDisplayState: Record<string, boolean>;
  toggleColumn: (colKey: string) => void;
}

export const ColumnPicker = <T extends RecordWithId>({
  columns,
  columnDisplayState,
  toggleColumn,
}: ColumnPickerProps<T>) => {
  const t = useTranslation();
  const [anchorEl, setAnchorEl] = React.useState<HTMLButtonElement | null>(
    null
  );

  const open = Boolean(anchorEl);
  const id = open ? 'simple-popover' : undefined;

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <>
      <Tooltip title={t('table.show-columns')}>
        <IconButton onClick={handleClick} aria-describedby={id}>
          <ColumnsIcon
            sx={{
              color: !columns.every(
                c =>
                  columnDisplayState[String(c.key)] ||
                  // If a column has no state (undefined), it must be a new
                  // column, so we treat it as visible
                  columnDisplayState[String(c.key)] === undefined
              )
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
          {columns
            .filter(c => !!c.label)
            .map(column => (
              <FormControlLabel
                key={String(column.key)}
                checked={columnDisplayState[column.key] ?? true}
                control={
                  <Checkbox onClick={() => toggleColumn(String(column.key))} />
                }
                label={t(column.label as LocaleKey)}
              />
            ))}
        </Stack>
      </Popover>
    </>
  );
};
