import React from 'react';
import {
  ButtonWithIcon,
  PlusCircleIcon,
  useTranslation,
  useConfirmationModal,
  useAlertModal,
  RouteBuilder,
  useNavigate,
} from '@openmsupply-client/common';
import { useResponse } from '../../api';
import { AppRoute } from '@openmsupply-client/config/src';

export const CreateShipmentButtonComponent = () => {
  const { lines, linesRemainingToSupply } = useResponse.document.fields([
    'lines',
    'linesRemainingToSupply',
  ]);
  const t = useTranslation('distribution');
  const { mutateAsync } = useResponse.utils.createOutbound();
  const isDisabled = useResponse.utils.isDisabled();
  const navigate = useNavigate();
  const createOutbound = () => {
    mutateAsync().then(invoiceNumber => {
      navigate(
        RouteBuilder.create(AppRoute.Distribution)
          .addPart(AppRoute.OutboundShipment)
          .addPart(String(invoiceNumber))
          .build()
      );
    });
  };

  const getConfirmation = useConfirmationModal({
    iconType: 'info',
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
