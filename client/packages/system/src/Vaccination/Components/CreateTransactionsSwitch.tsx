import { LocaleKey, Switch, useTranslation } from '@openmsupply-client/common';
import React from 'react';
import { VaccinationDraft } from '../api';
import { VaccinationDetailFragment } from '../api/operations.generated';
import { OTHER_FACILITY } from './FacilitySearchInput';

export const CreateTransactionsSwitch = ({
  draft,
  vaccination,
  hasDosesConfigured,
  updateDraft,
}: {
  draft: VaccinationDraft;
  hasDosesConfigured: boolean;
  vaccination?: VaccinationDetailFragment | null;
  updateDraft: (update: Partial<VaccinationDraft>) => void;
}) => {
  const t = useTranslation('dispensary');

  const show = shouldShowSwitch(draft, hasDosesConfigured, vaccination);

  return (
    <>
      {show && (
        <Switch
          label={t(getLabelKey(draft, vaccination))}
          checked={draft.createTransactions}
          onChange={() =>
            updateDraft({
              createTransactions: !draft.createTransactions,
            })
          }
          labelPlacement="end"
          size="small"
        />
      )}
    </>
  );
};

export function shouldShowSwitch(
  draft: VaccinationDraft,
  hasDosesConfigured: boolean,
  vaccination?: VaccinationDetailFragment | null
): boolean {
  const isHistorical = draft.date?.toDateString() !== new Date().toDateString();
  const noExistingSelectedBatch = !vaccination?.stockLine;

  // Ask user if they want to record a historical transaction
  if (
    isHistorical &&
    noExistingSelectedBatch &&
    draft.given &&
    hasDosesConfigured
  ) {
    return true;
  }

  // Invoice already exists
  if (!!vaccination?.invoice) {
    // Changing to state where invoice should not have been created
    if (draft.facilityId === OTHER_FACILITY || draft.given === false) {
      return true;
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
      return true;
    }
  }

  return false;
}

export function getLabelKey(
  draft: VaccinationDraft,
  vaccination?: VaccinationDetailFragment | null
): LocaleKey {
  const isHistorical = draft.date?.toDateString() !== new Date().toDateString();

  if (isHistorical && !vaccination?.stockLine) {
    return 'label.record-stock-transaction';
  }
  if (vaccination?.invoice) {
    if (draft.facilityId === OTHER_FACILITY || draft.given === false) {
      return 'label.revert-existing-transaction';
    }
  }
  return 'label.update-transactions';
}
