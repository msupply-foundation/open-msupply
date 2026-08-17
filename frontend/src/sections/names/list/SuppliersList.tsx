import type { Component } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import { t } from '../../../intl';
import { NamesList } from './NamesList';
import { supplierDetailPath } from './namesListLogic';

// S2 — Supplier list (from Replenishment). The standard names list scoped to
// the active store's suppliers (AC-N2); a row NAVIGATES to the supplier's
// detail page (AC-N15), unlike the customer list's in-place modal.
const SuppliersList: Component = () => {
  const params = useParams<{ storeId: string }>();
  const navigate = useNavigate();

  return (
    <NamesList
      role="supplier"
      scope="supplier"
      tableId="names-suppliers"
      crumbs={() => [{ label: t('nav.replenishment.suppliers') }]}
      onRowClick={row => navigate(supplierDetailPath(params.storeId, row.id))}
    />
  );
};

export default SuppliersList;
