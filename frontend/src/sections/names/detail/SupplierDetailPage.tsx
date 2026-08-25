import { createResource, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { useNavigate, useParams, useSearchParams } from '@solidjs/router';
import { graphqlFetch } from '../../../api/graphql';
import { t } from '../../../intl';
import { Page } from '../../../ui/layout/Page/Page';
import { Header } from '../../../ui/layout/Header/Header';
import { Breadcrumb } from '../../../ui/layout/Header/Breadcrumb';
import { Tabs, TabList, TabPanel } from '../../../ui/elements/tabs/Tabs';
import { ConfirmDialog } from '../../../ui/elements/feedback/ConfirmDialog';
import { Spinner } from '../../../ui/elements/feedback/Spinner';
import { NameById } from '../names.generated';
import { suppliersListPath } from '../list/namesListLogic';
import { detailFromResult } from './nameDetail';
import { SupplierDetailsTab } from './SupplierDetailsTab';
import { CustomFieldsView } from '../../../domain/customFields';
import { ContactsTab } from './ContactsTab';
import { PurchaseOrdersTab } from './PurchaseOrdersTab';

// S4 — Supplier detail page (read-only), routed at
// /{storeId}/replenishment/suppliers/:nameId (AC-N15, AC-N21). Page-level tabs:
// Details · Custom fields · Contacts · Purchase orders. No page actions, no
// footer — read-only throughout (AC-N22). The single-name read backs the
// Details and Custom fields tabs; Contacts and Purchase orders fetch their own
// data.

const SupplierDetailPage: Component = () => {
  const params = useParams<{ storeId: string; nameId: string }>();
  const navigate = useNavigate();
  // Tab state lives in the URL (`?tab=custom-fields`), so a reload or a shared
  // link restores the tab — matching the current app and the patient/item
  // detail views ([conventions ›
  // urls](../../../../spec/ui-standards/conventions.md)). The default (Details)
  // carries no param, keeping the base URL clean.
  const [searchParams, setSearchParams] = useSearchParams<{ tab?: string }>();
  const tab = () => searchParams.tab ?? 'details';
  const setTab = (value: string) =>
    setSearchParams({ tab: value === 'details' ? undefined : value });

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

  const backToList = () => navigate(suppliersListPath(params.storeId));

  // Tab order mirrors the current app: Details · Custom fields · Purchase
  // orders · Contacts (Contacts last) — spec/names ui-surface S4, AC-N21/FL5.
  const tabDefs = () => [
    { value: 'details', label: t('name.tab.details') },
    { value: 'custom-fields', label: t('name.tab.custom-fields') },
    { value: 'purchase-orders', label: t('name.tab.purchase-orders') },
    { value: 'contacts', label: t('name.tab.contacts') },
  ];

  const crumbs = () => [
    { label: t('nav.replenishment.suppliers'), onClick: backToList },
    // The leaf is the page <h1>, so it states which of the three states the
    // page is in — never "Loading…" for a record that will never arrive.
    {
      label:
        name()?.name ??
        (data.loading
          ? t('name.detail.loading')
          : t('error.supplier-not-found')),
    },
  ];

  return (
    <Tabs value={tab()} onValueChange={setTab}>
      <Page
        // Fill the body (no padding, non-scrolling) so the table tabs (Purchase
        // orders, Contacts) go full-bleed like the list views — the table
        // starts right after the side menu, not inset. The form tabs (Details,
        // Custom fields) self-pad and centre via their own DetailContainer, so
        // they stay correct without the body padding.
        fillBody
        header={
          <Header>
            <Breadcrumb crumbs={crumbs()} />
            <TabList tabs={tabDefs()} />
          </Header>
        }
      >
        <Show
          when={name()}
          fallback={
            // Spinner while the read is in flight; once it has settled with no
            // record, say so and offer the way back rather than spinning
            // forever (detail-views › states). The app-bar chrome (breadcrumb,
            // tabs) stays either way — this Show is inside the Page body.
            <Show when={!data.loading} fallback={<Spinner center />}>
              <ConfirmDialog
                open
                title={t('error.supplier-not-found')}
                message={t('messages.click-to-return-to-suppliers')}
                onConfirm={backToList}
                onClose={backToList}
              />
            </Show>
          }
        >
          {n => (
            <>
              <TabPanel value="details">
                <SupplierDetailsTab name={n()} />
              </TabPanel>
              <TabPanel value="custom-fields">
                <CustomFieldsView scope="supplier" values={n().customFields} />
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
