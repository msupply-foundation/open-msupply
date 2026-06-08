import React, { useEffect, useState } from 'react';
import { BasicTextInput } from '../TextInput';
import { CloseIcon, SearchIcon } from '@common/icons';
import { useDebouncedValueCallback } from '@common/hooks';
import { InlineSpinner } from '../../loading';
import { IconButton, InputAdornment } from '@common/components';
import { useTranslation } from '@common/intl';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  onSearchIconClick?: () => void;
  searchIconButtonLabel?: string;
  placeholder: string;
  isLoading?: boolean;
  debounceTime?: number;
  expandOnFocus?: boolean;
  autoFocus?: boolean;
}

const EndAdornment = ({
  hasValue,
  isLoading,
  onClear,
}: {
  isLoading: boolean;
  hasValue: boolean;
  onClear: () => void;
}) => {
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

export const SearchBar = ({
  value,
  onChange,
  onSearchIconClick,
  onClear,
  placeholder,
  isLoading = false,
  debounceTime = 500,
  expandOnFocus = false,
  searchIconButtonLabel = '',
  autoFocus = false,
}: SearchBarProps) => {
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

  const searchIcon = onSearchIconClick ? (
    <InputAdornment position="start">
      <IconButton
        icon={<SearchIcon fontSize="small" sx={{ color: 'gray.main' }} />}
        onClick={onSearchIconClick}
        label={searchIconButtonLabel}
      />
    </InputAdornment>
  ) : (
    <InputAdornment position="start">
      <SearchIcon fontSize="small" sx={{ color: 'gray.main' }} />
    </InputAdornment>
  );

  return (
    <BasicTextInput
      autoFocus={autoFocus}
      slotProps={{
        input: {
          startAdornment: searchIcon,
          endAdornment: (
            <EndAdornment
              isLoading={isLoading || loading}
              hasValue={!!buffer}
              onClear={() => {
                handleChange('');
                if (onClear) onClear();
              }}
            />
          ),
          sx: {
            width: '220px',
            ...(expandOnFocus
              ? {
                  transition: theme =>
                    theme.transitions.create('width', { delay: 100 }),
                  '&.Mui-focused': { width: '360px' },
                }
              : {}),
          },
        },
      }}
      value={buffer}
      onChange={e => handleChange(e.target.value)}
      label={placeholder}
    />
  );
};
