import React from 'react';
import {
  Grid,
  MenuItem,
  Select,
  Tooltip,
  Typography,
  useTranslation,
} from '@openmsupply-client/common';

interface ForecastMethodOption {
  code: string;
  label: string;
  isAvailable: boolean;
  unavailableReason?: string | null;
}

interface ForecastMethodPickerProps {
  options: ForecastMethodOption[];
  /// Current method storage form (`amc` / `population` / `ancillary_ratio` /
  /// `plugin:<code>`); `null` is treated as `amc`.
  value?: string | null;
  onChange: (code: string) => void;
  disabled?: boolean;
}

export const ForecastMethodPicker = ({
  options,
  value,
  onChange,
  disabled,
}: ForecastMethodPickerProps) => {
  const t = useTranslation();
  if (!options.length) return null;
  const current = value ?? 'amc';

  // Project Select expects a flat `options` shape; wrap in our own renderer
  // so disabled options can carry a tooltip with the reason from the server.
  const selectOptions = options.map(o => ({
    label: o.label,
    value: o.code,
    disabled: !o.isAvailable,
  }));

  const renderOption = (
    option: { label: string; value: string | number; disabled?: boolean },
  ) => {
    const meta = options.find(o => o.code === option.value);
    const item = (
      <MenuItem
        key={option.value}
        value={option.value}
        disabled={option.disabled}
      >
        {option.label}
      </MenuItem>
    );
    if (!meta || meta.isAvailable || !meta.unavailableReason) return item;
    // MUI Tooltip needs a non-disabled wrapper to fire pointer events on a
    // disabled MenuItem.
    return (
      <Tooltip key={option.value} title={meta.unavailableReason}>
        <span>{item}</span>
      </Tooltip>
    );
  };

  // Mirror the `InfoRow`/`ValueInfoRow` grid (8/4 split, same padding +
  // margin) so the picker lines up with the surrounding stat rows.
  return (
    <Grid
      container
      spacing={1}
      marginBottom={1}
      pl={1}
      pr={1.5}
      borderRadius={2}
      alignItems="center"
    >
      <Grid size={8}>
        <Typography variant="body1" fontWeight={700}>
          {t('label.target-stock-method')}:
        </Typography>
      </Grid>
      <Grid size={4} display="flex" justifyContent="flex-end">
        <Select
          options={selectOptions}
          renderOption={renderOption}
          value={current}
          disabled={disabled}
          onChange={e => onChange(e.target.value as string)}
          fullWidth
        />
      </Grid>
    </Grid>
  );
};

export default ForecastMethodPicker;
