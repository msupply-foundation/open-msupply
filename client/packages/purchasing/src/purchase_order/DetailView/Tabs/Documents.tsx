import React, { ReactElement } from 'react';
import { ButtonWithIcon, NothingHere } from '@common/components';
import { useTranslation } from '@common/intl';
import { useToggle } from '@common/hooks';
import { PlusCircleIcon } from '@common/icons';
import { PurchaseOrderFragment } from '../../api';
import { Grid } from '@openmsupply-client/common';
import {
  DocumentsTable,
  UploadDocumentModal,
} from '@openmsupply-client/system';

interface DocumentsProps {
  data: PurchaseOrderFragment | undefined;
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
        <DocumentsTable
          recordId={data?.id ?? ''}
          documents={data?.documents?.nodes ?? []}
          tableName="purchase_order"
          noDataElement={
            <NothingHere body={t('error.no-purchase-order-documents')} />
          }
          invalidateQueries={invalidateQueries}
        />
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
