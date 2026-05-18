import {
  useTranslation,
  useConfirmationModal,
  useAlertModal,
  RouteBuilder,
  useNavigate,
  useCallbackWithPermission,
  UserPermission,
} from '@openmsupply-client/common';
import { useResponse } from '../../api';
import { AppRoute } from '@openmsupply-client/config/src';

export const useCreateShipment = () => {
  const { lines, linesRemainingToSupply } = useResponse.document.fields([
    'lines',
    'linesRemainingToSupply',
  ]);
  const t = useTranslation();
  const { mutateAsync } = useResponse.utils.createOutbound();
  const navigate = useNavigate();
  const createOutbound = () => {
    mutateAsync().then(invoiceId => {
      navigate(
        RouteBuilder.create(AppRoute.Distribution)
          .addPart(AppRoute.OutboundShipment)
          .addPart(invoiceId)
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
    message: lines?.nodes.every(line => !line?.supplyQuantity)
      ? t('message.all-lines-have-no-supply-quantity')
      : t('message.all-lines-have-been-fulfilled'),
    onOk: () => {},
  });

  const onCreateShipment = () => {
    if (linesRemainingToSupply.totalCount > 0) {
      getConfirmation();
    } else {
      alert();
    }
  };

  const handleClick = useCallbackWithPermission(
    UserPermission.RequisitionCreateOutboundShipment,
    onCreateShipment,
    t('error.no-create-outbound-shipment-permission')
  );

  return { onCreateShipment: handleClick };
};
