import React, { ReactElement } from 'react';
import { PurchaseOrderFragment } from '../../api';
import { DocumentsTab } from '@openmsupply-client/system';

interface DocumentsProps {
  data?: PurchaseOrderFragment;
  disable: boolean;
  invalidateQueries: () => Promise<void>;
}

export const Documents = ({
  data,
  disable,
  invalidateQueries,
}: DocumentsProps): ReactElement => {
  return (
    <DocumentsTab
      recordId={data?.id ?? ''}
      documents={data?.documents?.nodes ?? []}
      tableName="purchase_order"
      invalidateQueries={invalidateQueries}
      canUpload={!disable}
      deletableDocumentIds={disable ? new Set<string>() : undefined}
    />
  );
};
