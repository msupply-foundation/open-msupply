import React, { FC, useEffect, useState } from 'react';
import { BasicTextInput } from '../TextInput';
import { CloseIcon, SearchIcon } from '@common/icons';
import { useDebouncedValueCallback } from '@common/hooks';
import { InlineSpinner } from '../../loading';
import { Box } from '@mui/material';
import { IconButton, InputAdornment } from '@common/components';
import { useTranslation } from '@common/intl';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  isLoading?: boolean;
  debounceTime?: number;
  expandOnFocus?: boolean;
}

const EndAdornment: FC<{
  isLoading: boolean;
  hasValue: boolean;
  onClear: () => void;
}> = ({ hasValue, isLoading, onClear }) => {
  const t = useTranslation();
  if (isLoading) return <InlineSpinner />;

  if (!hasValue) return null;

  return (
    <InputAdornment position="end">
      <IconButton
        sx={{ color: 'gray.main' }}
        label={t('label.clear-filter')}
        onClick={onClear}
        icon={<CloseIcon />}
      />
    </InputAdornment>
  );
};

export const SearchBar: FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder,
  isLoading = false,
  debounceTime = 500,
  expandOnFocus = false,
}) => {
  const [buffer, setBuffer] = useState(value);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setBuffer(value);
  }, [value]);

  const debouncedOnChange = useDebouncedValueCallback(
    value => {
      onChange(value);
      setLoading(false);
    },
    [onChange],
    debounceTime
  );

  const handleChange = (value: string) => {
    setBuffer(value);
    debouncedOnChange(value);
    setLoading(true);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-end',
      }}
    >
      <SearchIcon
        sx={{ color: 'gray.main', marginBottom: 1 }}
        fontSize="small"
      />
      <BasicTextInput
        slotProps={{
          input: {
            endAdornment: (
              <EndAdornment
                isLoading={isLoading || loading}
                hasValue={!!buffer}
                onClear={() => handleChange('')}
              />
            ),
            sx: {
              paddingLeft: '6px',
              alignItems: 'center',
              width: '220px',
              ...(expandOnFocus
                ? {
                    transition: theme =>
                      theme.transitions.create('width', {
                        delay: 100,
                      }),
                    '&.Mui-focused': {
                      width: '360px',
                    },
                  }
                : {}),
              backgroundColor: theme => theme.palette.background.menu,
            },
          },
        }}
        value={buffer}
        onChange={e => handleChange(e.target.value)}
        label={placeholder}
        sx={{
          '& .MuiInputLabel-root': {
            zIndex: 100,
            top: '4px',
            left: '8px',
            color: 'gray.main',
          },
          '& .MuiInputLabel-root.Mui-focused': {
            color: 'secondary.main',
          },
        }}
      />
    </Box>
  );
};
