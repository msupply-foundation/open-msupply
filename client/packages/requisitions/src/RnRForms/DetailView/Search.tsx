import React, { useEffect, useState } from 'react';
import {
  Box,
  IconButton,
  SearchBar,
  SearchIcon,
  useTranslation,
} from '@openmsupply-client/common';
import { useRnRFormContext } from '../api';

export const Search = () => {
  const t = useTranslation();

  const { search, scrollToIndex, resetSearch } = useRnRFormContext(
    ({ search, scrollToIndex, resetSearch }) => ({
      search,
      scrollToIndex,
      resetSearch,
    })
  );

  const [showSearch, setShowSearch] = useState(false);
  const [input, setInput] = useState('');

  useEffect(() => {
    return () => resetSearch();
  }, []);

  const onSearch = (value: string) => {
    setInput(value);
    // Only search when 3+ characters are entered
    if (value.length > 2) {
      let found = search(value);

      found != -1 && scrollToIndex(found);
    } else resetSearch();
  };

  return (
    <div>
      {showSearch && (
        <Box
          sx={{
            position: 'absolute',
            top: '2px',
            left: '2px',
            zIndex: 1000,
            backgroundColor: 'white',
            padding: '4px',
            borderRadius: '4px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          }}
        >
          <SearchBar
            alwaysClear={true}
            value={input}
            onChange={onSearch}
            placeholder={t('placeholder.search-by-name-or-code')}
            onClear={() => setShowSearch(false)}
            onSearchIconClick={() => setShowSearch(false)}
            searchIconButtonLabel={t('button.close')}
            autoFocus
          />
        </Box>
      )}
      <IconButton
        icon={<SearchIcon />}
        onClick={() => setShowSearch(true)}
        label={t('placeholder.search-by-name-or-code')}
      />
    </div>
  );
};
