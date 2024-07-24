import React from 'react';
import {
  // DataTable,
  NothingHere,
  // useColumns,
  useTranslation,
} from '@openmsupply-client/common';
// import { RequestLineFragment, useHideOverStocked, useRequest } from '../api';

interface ContentAreaProps {}

export const ContentArea = ({}: ContentAreaProps) => {
  const t = useTranslation('replenishment');
  // const { lines, columns, itemFilter } = useRequest.line.list();

  // const isDisabled = useRequest.utils.isDisabled();
  // const columns = useColumns([]);

  return (
    // <DataTable
    //   id="internal-order-detail"
    //   // onRowClick={onRowClick}
    //   columns={columns}
    //   data={[]}
    //   enableColumnSelection
    //   noDataElement={
    <NothingHere
      body={t('error.no-items')}
      // onCreate={isDisabled ? undefined : onAddItem}
      // buttonText={t('button.add-item')}
    />
    //     }
    //   />
  );
};
