import React, { ReactElement, useMemo } from 'react';
import { ResponseRowFragment } from '../../api';
import { DocumentsTab } from '@openmsupply-client/system';

interface DocumentsProps {
  data?: ResponseRowFragment;
  invalidateQueries: () => Promise<void>;
}

export const Documents = ({
  data,
  invalidateQueries,
}: DocumentsProps): ReactElement => {
  const deletableDocumentIds = useMemo(() => {
    const requisitionId = data?.id ?? '';
    return new Set(
      (data?.documents.nodes ?? [])
        .filter(doc => doc.recordId === requisitionId)
        .map(doc => doc.id)
    );
  }, [data?.id, data?.documents.nodes]);

  return (
    <DocumentsTab
      recordId={data?.id ?? ''}
      documents={data?.documents.nodes ?? []}
      tableName="requisition"
      invalidateQueries={invalidateQueries}
      canUpload={false}
      deletableDocumentIds={deletableDocumentIds}
    />
  );
};
