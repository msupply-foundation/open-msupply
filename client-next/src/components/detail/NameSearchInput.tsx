import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { NameFilterInput } from '@/gql/schema';
import { useTranslation } from '@/intl';
import { Label } from '@/components/ui/label';
import { SearchSelect } from '@/components/SearchSelect';
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
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      <SearchSelect
        disabled={disabled}
        autoFocus={autoFocus}
        value={value}
        options={data}
        getOptionLabel={o => `${o.code}  ${o.name}`}
        getOptionKey={o => o.id}
        onInputChange={setInput}
        loading={isFetching}
        loadingText={t('messages.loading')}
        noOptionsText={t('messages.no-results')}
        placeholder={t('placeholder.search')}
        onChange={onChange}
      />
    </div>
  );
}
