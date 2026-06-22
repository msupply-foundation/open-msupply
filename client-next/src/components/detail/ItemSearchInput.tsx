import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from '@/intl';
import { Label } from '@/components/ui/label';
import { SearchSelect } from '@/components/SearchSelect';
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
    <div className="grid gap-1.5">
      <Label>{t('label.item')}</Label>
      <SearchSelect
        disabled={disabled}
        autoFocus={autoFocus}
        value={value}
        options={options}
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
