/**
 * Shared utility functions specific to vaccination
 */

import { VaccinationDraft } from './api';
import { VaccinationCardItemFragment } from './api/operations.generated';

export const isPreviousDoseGiven = (
  row: VaccinationCardItemFragment,
  items: VaccinationCardItemFragment[] | undefined
) => {
  const vaccineCourseId = row.vaccineCourseId;
  if (!items) return false;
  const itemsForCourse = items.filter(
    item => item.vaccineCourseId === vaccineCourseId
  );
  const doseIndex = itemsForCourse.findIndex(dose => dose.id === row.id);
  if (doseIndex === 0) return true;
  return itemsForCourse[doseIndex - 1]?.given;
};

export const hasNoStocklineSelected = (
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
