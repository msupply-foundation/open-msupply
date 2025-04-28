import {
  ConfirmationModalContext,
  useConfirmationModal,
  useFormatDateTime,
  useTranslation,
} from '@openmsupply-client/common';
import { useContext } from 'react';

export const useConfirmEarlyVaccination = (
  suggestedDate: string | null | undefined,
  selectedDate: Date | null,
  onConfirm: () => void
) => {
  const t = useTranslation();
  const { setOpen } = useContext(ConfirmationModalContext);
  const { localisedDate } = useFormatDateTime();
  const showConfirmation = useConfirmationModal({
    // Typical onConfirm cleanup is to close the confirmation modal after
    // the onConfirm function is called. This is a bit different as we want to
    // close the confirmation modal, before a subsequent call in the onConfirm
    // might open it again.
    onConfirm: () => {
      setOpen(false);
      onConfirm();
    },
    cleanupConfirm: () => {},

    message: t('messages.confirm-early-vaccination', {
      date: localisedDate(suggestedDate || ''),
    }),

    title: t('heading.are-you-sure'),
  });

  return () => {
    const shouldShowConfirmation =
      suggestedDate && selectedDate && new Date(suggestedDate) > selectedDate;

    if (shouldShowConfirmation) {
      showConfirmation();
    } else {
      onConfirm();
    }
  };
};
