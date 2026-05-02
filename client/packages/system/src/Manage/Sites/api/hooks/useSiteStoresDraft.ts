import { useCallback, useEffect, useMemo, useState } from 'react';
import { SiteStoreRowFragment } from '../operations.generated';
import { useAssignStoresToSite, useStoresForSite } from './useSiteStores';
import { useSyncSettings } from '../../../../Sync/api/hooks/settings/useSyncSettings';

export type SiteStoreDraftRow = Pick<
  SiteStoreRowFragment,
  'id' | 'code' | 'storeName'
>;

export const useSiteStoresDraft = (siteId: number, isNew = false) => {
  const { data, isFetching } = useStoresForSite(siteId, !isNew);
  const { mutateAsync: assign, isLoading: isAssigning } =
    useAssignStoresToSite();
  const { data: syncSettings } = useSyncSettings();
  const unassignedSiteId =
    syncSettings?.syncSiteId ?? syncSettings?.centralServerSiteId ?? 0;

  const originalStores: SiteStoreDraftRow[] = useMemo(
    () => (isNew ? [] : (data?.nodes ?? [])),
    [isNew, data?.nodes]
  );

  const [draft, setDraft] = useState<SiteStoreDraftRow[] | null>(
    isNew ? [] : null
  );

  useEffect(() => {
    if (isNew) return;
    if (draft === null && !isFetching && data?.nodes) setDraft(data.nodes);
  }, [isNew, draft, isFetching, data?.nodes]);

  const addStore = useCallback((store: SiteStoreDraftRow) => {
    setDraft(v => {
      if (v?.some(s => s.id === store.id)) return v;
      return [...(v ?? []), store];
    });
  }, []);

  const removeStore = useCallback((id: string) => {
    setDraft(prev => (prev ?? []).filter(s => s.id !== id));
  }, []);

  const diff = useMemo(() => {
    const originalIds = new Set(originalStores.map(s => s.id));
    const draftIds = new Set((draft ?? originalStores).map(s => s.id));
    return {
      addedIds: [...draftIds].filter(id => !originalIds.has(id)),
      removedIds: [...originalIds].filter(id => !draftIds.has(id)),
    };
  }, [draft, originalStores]);

  const isDirty = diff.addedIds.length > 0 || diff.removedIds.length > 0;

  const save = useCallback(async () => {
    if (diff.addedIds.length > 0) {
      await assign({ siteId, storeIds: diff.addedIds });
    }
    if (diff.removedIds.length > 0 && siteId !== unassignedSiteId) {
      await assign({
        siteId: unassignedSiteId,
        storeIds: diff.removedIds,
      });
    }
  }, [assign, diff, siteId, unassignedSiteId]);

  return {
    stores: draft ?? originalStores,
    isFetching,
    isAssigning,
    isDirty,
    addStore,
    removeStore,
    save,
  };
};
