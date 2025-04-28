import {
  ConfirmationModalContext,
  useConfirmationModal,
  useFormatDateTime,
  useTranslation,
} from '@openmsupply-client/common';
import { useContext } from 'react';
import { VaccinationDraft } from '../api';

export const useConfirmEarlyVaccination = (
  suggestedDate: string | null | undefined,
  draft: VaccinationDraft,
  onConfirm: () => void
) => {
  const t = useTranslation();
  const { setOpen } = useContext(ConfirmationModalContext);
  const { localisedDate } = useFormatDateTime();
  const showConfirmation = useConfirmationModal({
    title: t('heading.are-you-sure'),
    message: t('messages.confirm-early-vaccination', {
      date: localisedDate(suggestedDate || ''),
    }),
    // Typical onConfirm cleanup is to close the confirmation modal after
    // the onConfirm function is called. This is a bit different as we want to
    // close the confirmation modal, before a subsequent call in the onConfirm
    // might open it again.
    onConfirm: () => {
      setOpen(false);
      onConfirm();
    },
    cleanupConfirm: () => {},
  });

  return () => {
    const shouldShowConfirmation =
      draft.given &&
      suggestedDate &&
      draft.date &&
      // Compare dates agnostic to time
      new Date(suggestedDate).toDateString() > draft.date.toDateString();

    if (shouldShowConfirmation) {
      showConfirmation();
    } else {
      onConfirm();
    }
  };
};
