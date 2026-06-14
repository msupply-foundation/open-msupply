import { useEffect, useMemo, useState } from 'react';
import { Autocomplete, TextField } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from '@/intl';
import { itemSearchQueryOptions } from '@/features/items/queries';
import type { ItemOptionFragment } from '@/features/items/items.generated';

interface ItemSearchInputProps {
  storeId: string;
  value: ItemOptionFragment | null;
  onChange: (item: ItemOptionFragment | null) => void;
  disabled?: boolean;
  /** Item ids already on the document, hidden from the options. */
  excludeItemIds?: string[];
  autoFocus?: boolean;
}

/**
 * Debounced item autocomplete backed by the `items` query (server-side search).
 * Used by the add-line dialogs across the document editors.
 */
export function ItemSearchInput({
  storeId,
  value,
  onChange,
  disabled,
  excludeItemIds,
  autoFocus,
}: ItemSearchInputProps) {
  const { t } = useTranslation();
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const id = setTimeout(() => setSearch(input), 300);
    return () => clearTimeout(id);
  }, [input]);

  const { data = [], isFetching } = useQuery({
    ...itemSearchQueryOptions(storeId, search),
    enabled: Boolean(storeId),
  });

  const options = useMemo(
    () =>
      excludeItemIds?.length
        ? data.filter(i => !excludeItemIds.includes(i.id))
        : data,
    [data, excludeItemIds],
  );

  return (
    <Autocomplete
      fullWidth
      disabled={disabled}
      value={value}
      options={options}
      filterOptions={x => x} // server-side filtering; don't re-filter locally
      getOptionLabel={o => `${o.code}  ${o.name}`}
      isOptionEqualToValue={(o, v) => o.id === v.id}
      loading={isFetching}
      loadingText={t('messages.loading')}
      noOptionsText={t('messages.no-results')}
      onChange={(_, v) => onChange(v)}
      onInputChange={(_, v) => setInput(v)}
      renderInput={params => (
        <TextField
          {...params}
          autoFocus={autoFocus}
          label={t('label.item')}
          placeholder={t('placeholder.search')}
        />
      )}
    />
  );
}
