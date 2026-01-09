import React, { ReactElement, useMemo } from 'react';
import {
  ColumnDef,
  MaterialTable,
  useNonPaginatedMaterialTable,
  useTranslation,
} from '@openmsupply-client/common';
import { useContacts } from '../apiModern/hooks';
import { ContactFragment } from '../apiModern/operations.generated';

interface ContactsProps {
  nameId: string;
}

export const Contacts = ({ nameId }: ContactsProps): ReactElement => {
  const t = useTranslation();
  const { data } = useContacts(nameId);

  const columns = useMemo(
    (): ColumnDef<ContactFragment>[] => [
      {
        accessorKey: 'firstName',
        header: t('label.first-name'),
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        accessorKey: 'lastName',
        header: t('label.last-name'),
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        accessorKey: 'position',
        header: t('label.position'),
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        accessorKey: 'email',
        header: t('label.email'),
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        accessorKey: 'phone',
        header: t('label.phone'),
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        accessorKey: 'category1',
        header: t('label.category-1'),
        enableSorting: true,
        enableColumnFilter: true,
      },
    ],
    []
  );

  const { table } = useNonPaginatedMaterialTable<ContactFragment>({
    tableId: 'supplier-contact',
    data,
    columns,
    enableRowSelection: false,
  });

  return <MaterialTable table={table} />;
};
