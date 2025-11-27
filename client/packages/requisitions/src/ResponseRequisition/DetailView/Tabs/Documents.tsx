import React, { ReactElement, useMemo } from 'react';
import { Grid } from '@openmsupply-client/common';
import { ResponseRowFragment } from '../../api';
import { DocumentsTable } from '@openmsupply-client/system';

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
    <Grid flex={1} sx={{ boxShadow: theme => theme.shadows[2] }}>
      <DocumentsTable
        recordId={data?.id ?? ''}
        documents={data?.documents.nodes ?? []}
        tableName="requisition"
        invalidateQueries={invalidateQueries}
        deletableDocumentIds={deletableDocumentIds}
      />
    </Grid>
  );
};
