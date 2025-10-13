import {
  useAuthContext,
  useConfirmationModal,
  useTranslation,
} from '@openmsupply-client/common';
import { VaccinationDraft } from '../api';

export const useConfirmNoStockLineSelected = (
  draft: VaccinationDraft,
  hasItems: boolean,
  onConfirm: () => void
) => {
  const t = useTranslation();
  const { store } = useAuthContext();
  const showConfirmation = useConfirmationModal({
    onConfirm,
    message: t('messages.no-batch-selected'),
    title: t('heading.are-you-sure'),
  });

  return () => {
    const shouldShowConfirmation = getShouldShowConfirmation(
      draft,
      hasItems,
      store?.nameId ?? ''
    );

    if (shouldShowConfirmation) {
      showConfirmation();
    } else {
      onConfirm();
    }
  };
};

export const getShouldShowConfirmation = (
  draft: VaccinationDraft,
  hasItems: boolean,
  facilityId: string
) => {
  const noSelectedBatch =
    // If the vaccine course has vaccine items configured
    // vaccinations given at this facility should have an associated stock line
    hasItems &&
    draft.given &&
    // Should only warn if vaccination given at the current store
    draft.facilityId === facilityId &&
    !draft.stockLine;

  const isHistorical = draft.date?.toDateString() !== new Date().toDateString();

  if (noSelectedBatch) {
    // Today's vaccinations should always have stock line associated
    if (!isHistorical) return true;

    // For historical vaccinations, only show the warning if the user has
    // selected to create transactions
    return draft.createTransactions;
  }

  return false;
};
