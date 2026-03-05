import {
  useTranslation,
  useConfirmationModal,
  InvoiceLineStatusType,
} from '@openmsupply-client/common';
import { useSaveInboundLines } from './useSaveInboundLines';
import { InboundLineFragment } from '../../operations.generated';

export const useChangeStatusOfInboundLines = (
  rowsToChangeStatus: InboundLineFragment[],
  resetRowSelection: () => void,
): ((status: 'approve' | 'reject') => void) => {
  const t = useTranslation();
  const { mutateAsync } = useSaveInboundLines();

  const onStatusUpdate = async (status: 'approve' | 'reject') => {
    const linesToUpdate = rowsToChangeStatus.map(line => ({
      ...line,
      status: status === 'approve' ? InvoiceLineStatusType.Passed : InvoiceLineStatusType.Rejected,
      isUpdated: true,
    }));
    await mutateAsync(linesToUpdate)
      .then(() => resetRowSelection())
      .catch(err => {
        throw err;
      });
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

  return (status) => status === 'approve' ? confirmAndApprove() : confirmAndReject();
};
