import React, { ReactElement } from 'react';
import {
  Box,
  ColumnDefinition,
  createTableStore,
  DataTable,
  NothingHere,
  TableProvider,
  useColumns,
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

  const columnDefinitions: ColumnDefinition<ContactFragment>[] = [
    {
      key: 'firstName',
      label: 'label.first-name',
      accessor: ({ rowData }) => rowData.firstName ?? '',
    },
    {
      key: 'lastName',
      label: 'label.last-name',
      accessor: ({ rowData }) => rowData.lastName ?? '',
    },
    {
      key: 'position',
      label: 'label.position',
      accessor: ({ rowData }) => rowData.position ?? '',
    },
    {
      key: 'email',
      label: 'label.email',
      accessor: ({ rowData }) => rowData.email ?? '',
    },
    {
      key: 'phone',
      label: 'label.phone',
      accessor: ({ rowData }) => rowData.phone ?? '',
    },
    {
      key: 'category1',
      label: 'label.category-1',
      accessor: ({ rowData }) => rowData.category1 ?? '',
    },
  ];

  const columns = useColumns(columnDefinitions);

  return (
    <TableProvider createStore={createTableStore}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          flex: 1,
        }}
      >
        <DataTable
          id="supplier-contact"
          columns={columns}
          data={data}
          noDataElement={<NothingHere body={t('error.no-contact')} />}
        />
      </Box>
    </TableProvider>
  );
};
