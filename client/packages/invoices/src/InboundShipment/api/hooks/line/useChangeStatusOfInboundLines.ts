import {
  useTranslation,
  useConfirmationModal,
  useNotification,
  InvoiceLineStatusType,
} from '@openmsupply-client/common';
import { useSaveInboundLines } from './useSaveInboundLines';
import { InboundLineFragment } from '../../operations.generated';
import { useInboundShipment } from '../useInboundShipment';

type LineStatusAction = 'approve' | 'reject' | 'pending';

const statusMap: Record<LineStatusAction, InvoiceLineStatusType> = {
  approve: InvoiceLineStatusType.Passed,
  reject: InvoiceLineStatusType.Rejected,
  pending: InvoiceLineStatusType.Pending,
};

export const useChangeStatusOfInboundLines = (
  rowsToChangeStatus: InboundLineFragment[],
  resetRowSelection: () => void
): ((status: LineStatusAction) => void) => {
  const t = useTranslation();
  const { error } = useNotification();
  const { isExternal } = useInboundShipment();
  const { mutateAsync } = useSaveInboundLines(isExternal);

  const onStatusUpdate = async (status: LineStatusAction) => {
    const linesToUpdate = rowsToChangeStatus.map(line => ({
      ...line,
      status: statusMap[status],
      isUpdated: true,
    }));
    try {
      await mutateAsync(linesToUpdate);
      resetRowSelection();
    } catch (e) {
      error(t('error.something-wrong'))();
    }
  };

  const confirmAndApprove = useConfirmationModal({
    title: t('heading.are-you-sure'),
    message: t(`messages.approve-inbound-lines`, {
      count: rowsToChangeStatus.length,
    }),
    onConfirm: () => onStatusUpdate('approve'),
  });

  const confirmAndReject = useConfirmationModal({
    title: t('heading.are-you-sure'),
    message: t(`messages.reject-inbound-lines`, {
      count: rowsToChangeStatus.length,
    }),
    onConfirm: () => onStatusUpdate('reject'),
  });

  const confirmAndSetPending = useConfirmationModal({
    title: t('heading.are-you-sure'),
    message: t(`messages.pending-inbound-lines`, {
      count: rowsToChangeStatus.length,
    }),
    onConfirm: () => onStatusUpdate('pending'),
  });

  return status => {
    if (status === 'approve') return confirmAndApprove();
    if (status === 'reject') return confirmAndReject();
    return confirmAndSetPending();
  };
};
