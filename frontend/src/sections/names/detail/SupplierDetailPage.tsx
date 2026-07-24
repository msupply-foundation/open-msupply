import { createResource, createSignal, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import { graphqlFetch } from '../../../api/graphql';
import { t } from '../../../intl';
import { Page } from '../../../ui/layout/Page/Page';
import { Header } from '../../../ui/layout/Header/Header';
import { Breadcrumb } from '../../../ui/layout/Header/Breadcrumb';
import { Tabs, TabList, TabPanel } from '../../../ui/elements/tabs/Tabs';
import { Spinner } from '../../../ui/elements/feedback/Spinner';
import { NameById } from '../names.generated';
import { suppliersListPath } from '../list/namesListLogic';
import { detailFromResult } from './nameDetail';
import { SupplierDetailsTab } from './SupplierDetailsTab';
import { CustomFieldsTab } from './CustomFieldsTab';
import { ContactsTab } from './ContactsTab';
import { PurchaseOrdersTab } from './PurchaseOrdersTab';

// S4 — Supplier detail page (read-only), routed at
// /{storeId}/replenishment/suppliers/:nameId (AC-N15, AC-N21). Page-level tabs:
// Details · Custom fields · Contacts · Purchase orders. No page actions, no
// footer — read-only throughout (AC-N22). The single-name read backs the Details
// and Custom fields tabs; Contacts and Purchase orders fetch their own data.

const SupplierDetailPage: Component = () => {
  const params = useParams<{ storeId: string; nameId: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = createSignal('details');

  const [data] = createResource(
    () => params.nameId,
    async nameId => {
      const result = await graphqlFetch(NameById, {
        storeId: params.storeId,
        nameId,
      });
      if (result.kind !== 'success') return undefined;
      return detailFromResult(result.data);
    }
  );
  const name = () => data.latest;

  // Tab order mirrors the current app: Details · Custom fields · Purchase orders
  // · Contacts (Contacts last) — spec/names ui-surface S4, AC-N21/FL5.
  const tabDefs = () => [
    { value: 'details', label: t('name.tab.details') },
    { value: 'custom-fields', label: t('name.tab.custom-fields') },
    { value: 'purchase-orders', label: t('name.tab.purchase-orders') },
    { value: 'contacts', label: t('name.tab.contacts') },
  ];

  const crumbs = () => [
    { label: t('nav.replenishment') },
    {
      label: t('nav.replenishment.suppliers'),
      onClick: () => navigate(suppliersListPath(params.storeId)),
    },
    { label: name()?.name ?? t('name.detail.loading') },
  ];

  return (
    <Tabs value={tab()} onValueChange={setTab}>
      <Page
        // Fill the body (no padding, non-scrolling) so the table tabs (Purchase
        // orders, Contacts) go full-bleed like the list views — the table starts
        // right after the side menu, not inset. The form tabs (Details, Custom
        // fields) self-pad and centre via their own DetailContainer, so they
        // stay correct without the body padding.
        fillBody
        header={
          <Header>
            <Breadcrumb crumbs={crumbs()} />
            <TabList tabs={tabDefs()} />
          </Header>
        }
      >
        <Show when={name()} fallback={<Spinner center />}>
          {n => (
            <>
              <TabPanel value="details">
                <SupplierDetailsTab name={n()} />
              </TabPanel>
              <TabPanel value="custom-fields">
                <CustomFieldsTab customFields={n().customFields} />
              </TabPanel>
              <TabPanel value="purchase-orders">
                <PurchaseOrdersTab supplierName={n().name} />
              </TabPanel>
              <TabPanel value="contacts">
                <ContactsTab nameId={params.nameId} />
              </TabPanel>
            </>
          )}
        </Show>
      </Page>
    </Tabs>
  );
};

export default SupplierDetailPage;
