import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from '@/intl';
import { Label } from '@/components/ui/label';
import { SearchSelect } from '@/components/SearchSelect';
import {
  stocktakeLocationsQueryOptions,
  stocktakeMasterListsQueryOptions,
} from './queries';
import type {
  LocationOptionFragment,
  MasterListOptionFragment,
  VvmStatusOptionFragment,
} from './stocktake.generated';

// 300ms debounce shared by the server-searched pickers.
function useDebounced(value: string, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export function LocationSearchInput({
  storeId,
  value,
  onChange,
}: {
  storeId: string;
  value: LocationOptionFragment | null;
  onChange: (v: LocationOptionFragment | null) => void;
}) {
  const { t } = useTranslation();
  const [input, setInput] = useState('');
  const search = useDebounced(input);
  const { data = [], isFetching } = useQuery({
    ...stocktakeLocationsQueryOptions(storeId, search),
    enabled: Boolean(storeId),
  });

  return (
    <div className="grid gap-1.5">
      <Label>{t('label.location')}</Label>
      <SearchSelect
        clearable
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

export function MasterListSearchInput({
  storeId,
  value,
  onChange,
}: {
  storeId: string;
  value: MasterListOptionFragment | null;
  onChange: (v: MasterListOptionFragment | null) => void;
}) {
  const { t } = useTranslation();
  const [input, setInput] = useState('');
  const search = useDebounced(input);
  const { data = [], isFetching } = useQuery({
    ...stocktakeMasterListsQueryOptions(storeId, search),
    enabled: Boolean(storeId),
  });

  return (
    <div className="grid gap-1.5">
      <Label>{t('label.master-list')}</Label>
      <SearchSelect
        clearable
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

// VVM statuses are a short, unfiltered list; no server search.
export function VVMStatusSearchInput({
  value,
  options,
  onChange,
}: {
  value: VvmStatusOptionFragment | null;
  options: VvmStatusOptionFragment[];
  onChange: (v: VvmStatusOptionFragment | null) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="grid gap-1.5">
      <Label>{t('label.vvm-status')}</Label>
      <SearchSelect
        clearable
        value={value}
        options={options}
        getOptionLabel={o => o.description}
        getOptionKey={o => o.id}
        noOptionsText={t('messages.no-results')}
        placeholder={t('placeholder.search')}
        onChange={onChange}
      />
    </div>
  );
}
