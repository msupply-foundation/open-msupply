import { LocaleKey } from '@openmsupply-client/common';
import { VaccinationDraft } from '../api';
import { VaccinationDetailFragment } from '../api/operations.generated';
import { OTHER_FACILITY } from './FacilitySearchInput';

export function getSwitchReason(
  draft: VaccinationDraft,
  hasDosesConfigured: boolean,
  vaccination?: VaccinationDetailFragment | null
): LocaleKey | null {
  const isHistorical = draft.date?.toDateString() !== new Date().toDateString();
  const noExistingSelectedBatch = !vaccination?.stockLine;

  // Ask user if they want to record a historical transaction
  if (
    isHistorical &&
    noExistingSelectedBatch &&
    draft.given &&
    hasDosesConfigured
  ) {
    return 'label.record-stock-transaction';
  }

  // Invoice already exists
  if (!!vaccination?.invoice) {
    // Changing to state where invoice should not have been created
    if (draft.facilityId === OTHER_FACILITY || draft.given === false) {
      return 'label.revert-existing-transaction';
    }
  }

  // Vaccination already exists
  if (!!vaccination) {
    // And we're changing the stock line (or changing to given and selecting a stock line)
    if (
      hasDosesConfigured &&
      draft.facilityId !== OTHER_FACILITY &&
      draft.given &&
      draft.stockLine?.id !== vaccination.stockLine?.id
    ) {
      return 'label.update-transactions';
    }
  }

  return null;
}
