import React from 'react';
import { ButtonWithIcon } from '@common/components';
import { useTranslation } from '@common/intl';
import { useToggle } from '@common/hooks';
import { PlusCircleIcon } from '@common/icons';
import { PurchaseOrderFragment } from '../../api';
import { useQueryClient } from '@openmsupply-client/common';
import { UploadDocumentModal } from '@openmsupply-client/system';
import { PURCHASE_ORDER } from '../../api/hooks/keys';

interface UploadDocumentButtonProps {
  purchaseOrder: PurchaseOrderFragment | undefined;
  disable: boolean;
}

export const UploadDocumentButton = ({
  purchaseOrder,
  disable,
}: UploadDocumentButtonProps) => {
  const t = useTranslation();
  const queryClient = useQueryClient();

  const uploadDocumentController = useToggle();

  const invalidateQueries = () =>
    queryClient.invalidateQueries([PURCHASE_ORDER]);

  return (
    <>
      <ButtonWithIcon
        color="primary"
        onClick={uploadDocumentController.toggleOn}
        disabled={disable}
        Icon={<PlusCircleIcon />}
        label={t('label.upload-document')}
      />
      {uploadDocumentController.isOn && (
        <UploadDocumentModal
          isOn={uploadDocumentController.isOn}
          toggleOff={uploadDocumentController.toggleOff}
          recordId={purchaseOrder?.id ?? ''}
          tableName="purchase_order"
          invalidateQueries={invalidateQueries}
        />
      )}
    </>
  );
};
