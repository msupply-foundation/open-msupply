import { createResource } from 'solid-js';
import type { Component } from 'solid-js';
import { useParams } from '@solidjs/router';
import { graphqlFetch } from '../../../api/graphql';
import { t } from '../../../intl';
import { DataTable, type Column } from '../../../ui/elements/table/DataTable';
import { Contacts } from '../names.generated';
import type { ContactsResult } from '../names.generated';
import { contactCategory, contactFullName } from './nameDetail';

// S4 Contacts tab — a read-only list of the name's contacts (AC-N23): name,
// position, email, phone, category. Store- AND name-scoped. No toolbar controls,
// no selection, no row actions — there is no contact CRUD in the schema
// (read-only). Full-screen is disabled so the table shows no toolbar action.

type ContactRow = ContactsResult['contacts']['nodes'][number];

export const ContactsTab: Component<{ nameId: string }> = props => {
  const params = useParams<{ storeId: string }>();

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

  // Contacts aren't sortable here — no SortKey, so `never`.
  const columns = (): Column<ContactRow, never>[] => [
    {
      c: { id: 'name' },
      header: t('name.contacts.name'),
      cell: info => contactFullName(info.row.original),
    },
    { c: { key: 'position' }, header: t('name.contacts.position') },
    { c: { key: 'email' }, header: t('name.contacts.email') },
    { c: { key: 'phone' }, header: t('name.contacts.phone') },
    {
      c: { id: 'category' },
      header: t('name.contacts.category'),
      cell: info => contactCategory(info.row.original),
    },
  ];

  return (
    <DataTable
      columns={columns()}
      rows={data.latest ?? []}
      rowKey={r => r.id}
      loading={data.loading}
      emptyMessage={t('name.contacts.empty')}
      showFullScreen={false}
    />
  );
};
