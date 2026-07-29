import { createResource } from 'solid-js';
import type { Component } from 'solid-js';
import { useParams } from '@solidjs/router';
import { graphqlFetch } from '../../../api/graphql';
import { t } from '../../../intl';
import { createTableConfig } from '../../../api/createTableConfig';
import { DataTable, type Column } from '../../../ui/elements/table/DataTable';
import {
  getCellDefinition,
  getTextCell,
} from '../../../ui/elements/table/tableHelpers';
import { remToPx } from '../../../ui/utils/rem';
import { Contacts } from '../names.generated';
import type { ContactsResult } from '../names.generated';

// S4 Contacts tab — a read-only list of the name's contacts (AC-N23): first
// name, last name, position, email, phone, category 1. Store- AND name-scoped.
// No row selection and no row actions — there is no contact CRUD in the schema
// (read-only). It is the standard data table (with its view-control toolbar),
// matching the list views (spec/ui-standards/detail-views › tabs).

type ContactRow = ContactsResult['contacts']['nodes'][number];

export const ContactsTab: Component<{ nameId: string }> = props => {
  const params = useParams<{ storeId: string }>();
  const tableConfig = createTableConfig({ tableId: 'names-contacts' });

  const [data] = createResource(
    () => props.nameId,
    async nameId => {
      const result = await graphqlFetch(Contacts, {
        storeId: params.storeId,
        nameId,
      });
      if (result.kind !== 'success') return [];
      return result.data.contacts.nodes;
    }
  );

  // Non-suspending read (opened on interaction — see the reactivity note in
  // domain/customFields CustomFieldsView / kdd/solid-reactivity-pitfalls).
  const rows = (): ContactRow[] =>
    data.state === 'ready' || data.state === 'refreshing'
      ? (data.latest ?? [])
      : [];

  // Contacts aren't sortable here — no SortKey, so `never`. Each column takes
  // its cell type's width preset (docs/CELL_TYPES.md); `position` and
  // `category1` have no CELL_DEF key, so they keep the explicit text helper and
  // set the width at the call site.
  const columns = (): Column<ContactRow, never>[] => [
    {
      c: { key: 'firstName' },
      header: () => t('label.first-name'),
      ...getCellDefinition('firstName'),
    },
    {
      c: { key: 'lastName' },
      header: () => t('label.last-name'),
      ...getCellDefinition('lastName'),
    },
    {
      c: { key: 'position' },
      header: () => t('label.position'),
      ...getTextCell(),
      size: remToPx(10),
    },
    {
      c: { key: 'email' },
      header: () => t('label.email'),
      ...getCellDefinition('email'),
    },
    {
      c: { key: 'phone' },
      header: () => t('label.phone'),
      ...getCellDefinition('phone'),
    },
    {
      c: { key: 'category1' },
      header: () => t('label.category-1'),
      ...getTextCell(),
      size: remToPx(10),
    },
  ];

  return (
    <DataTable
      columns={columns()}
      rows={rows()}
      rowKey={r => r.id}
      loading={data.loading}
      emptyMessage={t('name.contacts.empty')}
      config={tableConfig.config()}
      setConfig={tableConfig.setConfig}
      configIsDefault={tableConfig.isConfigDefault()}
      onSaveGlobalDefault={
        tableConfig.canSaveGlobalDefault()
          ? tableConfig.saveGlobalTableConfig
          : undefined
      }
    />
  );
};
