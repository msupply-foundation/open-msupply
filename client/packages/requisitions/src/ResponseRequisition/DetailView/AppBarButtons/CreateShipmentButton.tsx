import React from 'react';
import {
  ButtonWithIcon,
  PlusCircleIcon,
  useTranslation,
  useConfirmationModal,
  useAlertModal,
} from '@openmsupply-client/common';
import { useCreateOutboundFromResponse, useResponseFields } from '../../api';

export const CreateShipmentButtonComponent = () => {
  const { linesRemainingToSupply } = useResponseFields(
    'linesRemainingToSupply'
  );
  const t = useTranslation('distribution');
  const { mutate: createOutbound } = useCreateOutboundFromResponse();
  const getConfirmation = useConfirmationModal({
    onConfirm: createOutbound,
    message: t('messages.create-outbound-from-requisition'),
    title: t('heading.create-outbound-shipment'),
  });
  const alert = useAlertModal({
    title: t('heading.cannot-do-that'),
    message: t('message.all-lines-have-been-fulfilled'),
  });

  const onCreateShipment = () => {
    if (linesRemainingToSupply.totalCount > 0) {
      alert();
    } else {
      getConfirmation();
    }
  };

  return (
    <ButtonWithIcon
      Icon={<PlusCircleIcon />}
      label={t('button.create-shipment')}
      onClick={onCreateShipment}
    />
  );
};

export const CreateShipmentButton = React.memo(CreateShipmentButtonComponent);
