import { useConfirmationModal } from '@common/components';
import { useTranslation } from '@common/intl';
import { VaccinationDraft } from '../api';
import { OTHER_FACILITY } from './FacilitySearchInput';

export const useConfirmNoStockLineSelected = (
  draft: VaccinationDraft,
  hasItems: boolean,
  onConfirm: () => Promise<void>
) => {
  const t = useTranslation('dispensary');
  const showConfirmation = useConfirmationModal({
    onConfirm,
    message: t('messages.no-batch-selected'),
    title: t('heading.are-you-sure'),
  });

  return () => {
    const shouldShowConfirmation = getShouldShowConfirmation(draft, hasItems);

    if (shouldShowConfirmation) {
      showConfirmation();
    } else {
      onConfirm();
    }
  };
};

const getShouldShowConfirmation = (
  draft: VaccinationDraft,
  hasItems: boolean
) => {
  const noSelectedBatch =
    // If the vaccine course has vaccine items configured
    // vaccinations given at this facility should have an associated stock line
    hasItems &&
    draft.given &&
    draft.facilityId !== OTHER_FACILITY &&
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
