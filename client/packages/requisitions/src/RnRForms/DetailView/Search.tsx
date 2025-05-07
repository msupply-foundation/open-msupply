import React, { useState } from 'react';
import {
  Box,
  IconButton,
  SearchBar,
  SearchIcon,
  useTranslation,
} from '@openmsupply-client/common';
import { useRnRFormContext } from '../api';

export const Search = (props: { onSearch: (value: string) => void }) => {
  const t = useTranslation();

  const { search, setSearch } = useRnRFormContext(({ search, setSearch }) => ({
    search,
    setSearch,
  }));

  const [showSearch, setShowSearch] = useState(false);
  const [input, setInput] = useState(search);

  const onSearch = (value: string) => {
    setInput(value);
    // Only search when 3+ characters are entered
    if (value.length > 2) {
      setSearch(value);
      props.onSearch(value);
    } else setSearch('');
  };

  return (
    <div>
      {showSearch ? (
        <Box
          sx={{
            position: 'absolute',
            top: '2px',
            right: '2px',
            zIndex: 1000,
            backgroundColor: 'white',
            padding: '4px',
            borderRadius: '4px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          }}
        >
          <SearchBar
            value={input}
            onChange={onSearch}
            placeholder={t('placeholder.search-by-name-or-code')}
            onClear={() => setShowSearch(false)}
            debounceTime={0}
            alwaysShowClear
            autoFocus
          />
        </Box>
      ) : (
        <IconButton
          icon={<SearchIcon />}
          onClick={() => setShowSearch(true)}
          label={t('placeholder.search-by-name-or-code')}
        />
      )}
    </div>
  );
};
