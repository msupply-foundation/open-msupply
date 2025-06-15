import React, { ReactElement } from 'react';
import {
  Box,
  createTableStore,
  DataTable,
  NothingHere,
  TableProvider,
  useColumns,
  useTranslation,
} from '@openmsupply-client/common';

// TODO:
// This is still to be connected to the backend
// Column definitions and data are placeholders
// Labels are placeholders and should be replaced with actual translations

export const Contacts = (): ReactElement => {
  const t = useTranslation();

  const columns = useColumns(
    [
      {
        key: 'firstName',
        label: 'First Name',
      },
      {
        key: 'lastName',
        label: 'Last Name',
      },
      {
        key: 'position',
        label: 'Position',
      },
      {
        key: 'email',
        label: 'Email',
      },
      {
        key: 'phone',
        label: 'Phone',
      },
      {
        key: 'category',
        label: 'Category',
      },
    ],
    {
      sortBy: { key: 'orderDate', direction: 'desc' },
    }
  );

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
          data={[]}
          noDataElement={<NothingHere body={t('error.no-contact')} />}
        />
      </Box>
    </TableProvider>
  );
};
