import { createSignal } from 'solid-js';
import type { Component } from 'solid-js';
import { t } from '../../../intl';
import { NamesList } from './NamesList';
import { CustomerDetailModal } from '../detail/CustomerDetailModal';

// S1 — Customer list (from Distribution). The standard names list scoped to the
// active store's customers (AC-N1); a row opens the customer's detail IN PLACE,
// as a modal over the list (AC-N14). The modal stays mounted and is driven by
// the selected id so its native <dialog> close path (focus restore) runs
// cleanly.
const CustomersList: Component = () => {
  const [selectedId, setSelectedId] = createSignal<string>();

  return (
    <>
      <NamesList
        role="customer"
        scope="customer"
        tableId="names-customers"
        crumbs={() => [{ label: t('nav.distribution.customers') }]}
        onRowClick={row => setSelectedId(row.id)}
      />
      <CustomerDetailModal
        nameId={selectedId()}
        open={selectedId() !== undefined}
        onClose={() => setSelectedId(undefined)}
      />
    </>
  );
};

export default CustomersList;
