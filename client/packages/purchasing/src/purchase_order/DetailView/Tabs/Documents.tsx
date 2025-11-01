import React, { ReactElement } from 'react';
import {
  ButtonWithIcon,
  useTranslation,
  useToggle,
  PlusCircleIcon,
  Grid,
} from '@openmsupply-client/common';
import { PurchaseOrderFragment } from '../../api';
import {
  DocumentsTable,
  UploadDocumentModal,
} from '@openmsupply-client/system';

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
  const t = useTranslation();
  const uploadDocumentController = useToggle();

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
            tableName="purchase_order"
            invalidateQueries={invalidateQueries}
          />
        </Grid>
      </Grid>
      {uploadDocumentController.isOn && (
        <UploadDocumentModal
          isOn={uploadDocumentController.isOn}
          toggleOff={uploadDocumentController.toggleOff}
          recordId={data?.id ?? ''}
          tableName="purchase_order"
          invalidateQueries={invalidateQueries}
        />
      )}
    </>
  );
};
