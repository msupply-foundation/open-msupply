import React, { FC, useEffect, useState } from 'react';
import { BasicTextInput } from '../TextInput';
import { SearchIcon } from '../../../icons';
import { useDebounceCallback } from '../../../../hooks';
import { InlineSpinner } from '../../loading';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}

const Spin: FC<{ isLoading: boolean }> = ({ isLoading }) =>
  isLoading ? <InlineSpinner /> : null;

export const SearchBar: FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder,
}) => {
  const [buffer, setBuffer] = useState(value);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setBuffer(value);
  }, [value]);

  const debouncedOnChange = useDebounceCallback(
    value => {
      onChange(value);
      setLoading(false);
    },
    [onChange],
    500
  );

  return (
    <>
      <BasicTextInput
        InputProps={{
          startAdornment: <SearchIcon color="primary" />,
          endAdornment: <Spin isLoading={loading} />,
          sx: {
            paddingLeft: '6px',
            alignItems: 'center',
            transition: theme => theme.transitions.create('width'),
            width: '220px',
            '&.Mui-focused': {
              width: '360px',
            },
          },
        }}
        value={buffer}
        onChange={e => {
          setBuffer(e.target.value);
          debouncedOnChange(e.target.value);
          setLoading(true);
        }}
        placeholder={placeholder}
      />
    </>
  );
};
