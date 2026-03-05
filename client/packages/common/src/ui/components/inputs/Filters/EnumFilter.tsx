import React, { FC } from 'react';
import { useUrlQuery } from '@common/hooks';
import {
  Checkbox,
  ListItemText,
  MenuItem,
  TextField,
} from '@mui/material';
import { Select } from '@common/components';
import { FILTER_WIDTH, FilterDefinitionCommon } from './FilterMenu';
import { FilterLabelSx } from './styleConstants';

export interface EnumFilterDefinition extends FilterDefinitionCommon {
  type: 'enum';
  options: EnumOption[];
  isMultiSelect?: boolean;
}

type EnumOption = { label: string; value: string };

export const EnumFilter: FC<{
  filterDefinition: EnumFilterDefinition;
  remove: () => void;
}> = ({ filterDefinition }) => {
  const { urlParameter, options, name, isMultiSelect } = filterDefinition;
  const { urlQuery, updateQuery } = useUrlQuery();

  const rawValue = urlQuery[urlParameter] as string | undefined;

  if (isMultiSelect) {
    const selectedValues = rawValue ? String(rawValue).split(',') : [];

    const handleMultiChange = (
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
      const value = event.target.value;
      // MUI multi-select returns an array via event.target.value
      const newValues = typeof value === 'string' ? value.split(',') : value;
      updateQuery({
        [urlParameter]: (newValues as string[]).join(',') || undefined,
      });
    };

    return (
      <TextField
        select
        variant="standard"
        size="small"
        label={name}
        value={selectedValues}
        onChange={handleMultiChange}
        sx={{
          ...FilterLabelSx,
          width: FILTER_WIDTH,
          '& .MuiInput-underline:before': { borderBottomWidth: 0 },
          '& .MuiInput-input': { color: theme => theme.palette.gray.dark },
        }}
        slotProps={{
          input: {
            color: 'secondary',
            sx: {
              backgroundColor: 'background.input.main',
              borderRadius: 2,
              padding: '4px 8px',
            },
          },
          inputLabel: {
            color: 'secondary',
          },
          select: {
            multiple: true,
            renderValue: (selected: unknown) => {
              const values = selected as string[];
              return values
                .map(v => options.find(o => o.value === v)?.label ?? v)
                .join(', ');
            },
          },
        }}
      >
        {options.map(option => (
          <MenuItem key={option.value} value={option.value}>
            <Checkbox checked={selectedValues.includes(option.value)} />
            <ListItemText primary={option.label} />
          </MenuItem>
        ))}
      </TextField>
    );
  }

  const handleChange = (selection: string) => {
    if (!selection) {
      updateQuery({ [urlParameter]: '' });
      return;
    }
    const option = options.find(opt => opt.value === selection);
    if (!option) return;

    updateQuery({ [urlParameter]: option.value });
  };

  return (
    <Select
      options={options}
      placeholder={name}
      sx={{ ...FilterLabelSx, width: FILTER_WIDTH }}
      label={name}
      value={rawValue ?? ''}
      onChange={e => handleChange(e.target.value)}
      clearable
    />
  );
};
