import React from 'react';
import {
  ButtonWithIcon,
  PlusCircleIcon,
  useTranslation,
  useConfirmationModal,
  useAlertModal,
} from '@openmsupply-client/common';
import { useResponse } from '../../api';

export const CreateShipmentButtonComponent = () => {
  const { lines, linesRemainingToSupply } = useResponse.document.fields([
    'lines',
    'linesRemainingToSupply',
  ]);
  const t = useTranslation('distribution');
  const { mutate: createOutbound } = useResponse.utils.createOutbound();
  const isDisabled = useResponse.utils.isDisabled();

  const getConfirmation = useConfirmationModal({
    onConfirm: createOutbound,
    message: t('messages.create-outbound-from-requisition'),
    title: t('heading.create-outbound-shipment'),
  });
  const alert = useAlertModal({
    title: t('heading.cannot-do-that'),
    message: t(
      lines?.nodes.every(line => !line?.supplyQuantity)
        ? 'message.all-lines-have-no-supply-quantity'
        : 'message.all-lines-have-been-fulfilled'
    ),
    onOk: () => {},
  });
  const onCreateShipment = () => {
    if (linesRemainingToSupply.totalCount > 0) {
      getConfirmation();
    } else {
      alert();
    }
  };

  return (
    <ButtonWithIcon
      Icon={<PlusCircleIcon />}
      label={t('button.create-shipment')}
      onClick={onCreateShipment}
      disabled={isDisabled}
    />
  );
};

export const CreateShipmentButton = React.memo(CreateShipmentButtonComponent);
