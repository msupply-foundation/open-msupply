import React, { useCallback, useEffect } from 'react';
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
  useLocalStorage,
} from '@openmsupply-client/common';
import { LocaleKey, useTranslation } from '@common/intl';

interface ColumnPickerProps<T extends RecordWithId> {
  columns: Column<T>[];
  tableKey: string;
  onChange: (columns: Column<T>[]) => void;
}

export const ColumnPicker = <T extends RecordWithId>({
  tableKey,
  columns,
  onChange,
}: ColumnPickerProps<T>) => {
  const t = useTranslation();
  const [hiddenColumnsConfig, setHiddenColumnsConfig] =
    useLocalStorage('/columns/hidden');
  const [anchorEl, setAnchorEl] = React.useState<HTMLButtonElement | null>(
    null
  );

  const open = Boolean(anchorEl);
  const id = open ? 'simple-popover' : undefined;

  const getHiddenColumns = useCallback(
    () => hiddenColumnsConfig?.[tableKey] ?? [],
    [hiddenColumnsConfig, tableKey]
  );

  const isVisible = useCallback(
    (column: Column<T>) => !getHiddenColumns()?.includes(String(column.key)),
    [getHiddenColumns]
  );

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const toggleColumn = (column: Column<T>) => {
    const hidden = getHiddenColumns();
    const updatedColumns = isVisible(column)
      ? [...hidden, String(column.key)]
      : hidden.filter(key => key !== column.key);

    setHiddenColumnsConfig({
      ...hiddenColumnsConfig,
      [tableKey]: updatedColumns,
    });
  };

  useEffect(() => {
    return () => onChange(columns.filter(isVisible));
  }, [columns, onChange, isVisible]);

  return (
    <>
      <Tooltip title={t('table.show-columns')}>
        <IconButton onClick={handleClick} aria-describedby={id}>
          <ColumnsIcon
            sx={{
              color:
                getHiddenColumns().length > 0 ? 'secondary.main' : undefined,
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
