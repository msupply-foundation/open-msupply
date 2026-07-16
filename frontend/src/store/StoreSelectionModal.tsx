import type { Component } from 'solid-js';
import type { StoreSummary } from './StoreGuardLayout';
import { Dialog } from '../ui/elements/feedback/Dialog';
import { StoreSelector } from '../ui/elements/selectors/StoreSelector';
import { t } from '../intl';

// Spec (Store Login, Guard 2): the selection modal, presented whenever the URL
// does not resolve to a store. A blocking Dialog (not dismissable — there is no
// store behind it to fall back to; picking one is the only way forward) hosting
// the shared StoreSelector panel (search + list with Default / Last-used chips
// + Continue). The caller has already ordered default/previous to the top and
// names them so the chips show.
export const StoreSelectionModal: Component<{
  stores: StoreSummary[];
  defaultStoreId?: string;
  lastUsedStoreId?: string;
  onSelect: (storeId: string) => void;
}> = props => (
  <Dialog open dismissable={false} onClose={() => {}} title={t('store.select')}>
    <StoreSelector
      stores={props.stores}
      defaultStoreId={props.defaultStoreId}
      lastUsedStoreId={props.lastUsedStoreId}
      onConfirm={props.onSelect}
    />
  </Dialog>
);
