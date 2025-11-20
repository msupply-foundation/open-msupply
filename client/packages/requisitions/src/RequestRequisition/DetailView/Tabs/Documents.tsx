import React, { ReactElement, useMemo } from 'react';
import {
  ButtonWithIcon,
  RequisitionNodeStatus,
  useTranslation,
  useToggle,
  PlusCircleIcon,
  Grid,
} from '@openmsupply-client/common';
import { RequestRowFragment } from '../../api';
import {
  DocumentsTable,
  UploadDocumentModal,
} from '@openmsupply-client/system';

interface DocumentsProps {
  data?: RequestRowFragment;
  disable: boolean;
  invalidateQueries: () => Promise<void>;
}

export const Documents = ({
  data,
  disable,
  invalidateQueries,
}: DocumentsProps): ReactElement => {
  const t = useTranslation();
  const uploadDocumentController = useToggle();

  const deletableDocumentIds = useMemo(() => {
    if (data?.status === RequisitionNodeStatus.Finalised) {
      return new Set<string>();
    }
    // Request requisition can't have documents linked to response requisition.
    // So all documents linked to request requisition are deletable.
    return undefined;
  }, [data]);

  return (
    <>
      <Grid flex={1} display="flex" flexDirection="column">
        <Grid justifyContent="flex-end" display="flex" padding={1}>
          <ButtonWithIcon
            color="primary"
            onClick={uploadDocumentController.toggleOn}
            disabled={disable}
            Icon={<PlusCircleIcon />}
            label={t('label.upload-document')}
          />
        </Grid>
        <Grid flex={1} sx={{ boxShadow: theme => theme.shadows[2] }}>
          <DocumentsTable
            recordId={data?.id ?? ''}
            documents={data?.documents?.nodes ?? []}
            tableName="requisition"
            invalidateQueries={invalidateQueries}
            deletableDocumentIds={deletableDocumentIds}
          />
        </Grid>
      </Grid>
      {uploadDocumentController.isOn && (
        <UploadDocumentModal
          isOn={uploadDocumentController.isOn}
          toggleOff={uploadDocumentController.toggleOff}
          recordId={data?.id ?? ''}
          tableName="requisition"
          invalidateQueries={invalidateQueries}
        />
      )}
    </>
  );
};
