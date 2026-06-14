import { useEffect, useState } from 'react';
import { Autocomplete, TextField } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import type { NameFilterInput } from '@/gql/schema';
import { useTranslation } from '@/intl';
import { nameSearchQueryOptions } from '@/features/names/queries';
import type { NameRowFragment } from '@/features/names/names.generated';

interface NameSearchInputProps {
  storeId: string;
  /** Base filter selecting the party kind, e.g. { isSupplier: true, isVisible: true }. */
  filter: NameFilterInput;
  value: NameRowFragment | null;
  onChange: (name: NameRowFragment | null) => void;
  label: string;
  disabled?: boolean;
  autoFocus?: boolean;
}

/**
 * Debounced name autocomplete (customer / supplier / store) backed by the
 * `names` query. Used by the create-document dialogs to pick the other party.
 */
export function NameSearchInput({
  storeId,
  filter,
  value,
  onChange,
  label,
  disabled,
  autoFocus,
}: NameSearchInputProps) {
  const { t } = useTranslation();
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const id = setTimeout(() => setSearch(input), 300);
    return () => clearTimeout(id);
  }, [input]);

  const { data = [], isFetching } = useQuery({
    ...nameSearchQueryOptions(storeId, filter, search),
    enabled: Boolean(storeId),
  });

  return (
    <Autocomplete
      fullWidth
      disabled={disabled}
      value={value}
      options={data}
      filterOptions={x => x}
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
          label={label}
          placeholder={t('placeholder.search')}
        />
      )}
    />
  );
}
