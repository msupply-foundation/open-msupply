/**
 * Shared utility functions specific to vaccination
 */

import { VaccinationDraft } from './api';
import { VaccinationCardItemFragment } from './api/operations.generated';

export const getPreviousDoseStatus = (
  row: VaccinationCardItemFragment,
  items: VaccinationCardItemFragment[] | undefined
) => {
  const vaccineCourseId = row.vaccineCourseId;
  if (!items) return undefined;
  const itemsForCourse = items.filter(
    item => item.vaccineCourseId === vaccineCourseId
  );
  const doseIndex = itemsForCourse.findIndex(dose => dose.id === row.id);
  if (doseIndex === 0) return undefined;
  return itemsForCourse[doseIndex - 1]?.status;
};

export const isEditable = (
  row: VaccinationCardItemFragment,
  items: VaccinationCardItemFragment[] | undefined
) => {
  if (!items) return false;

  const itemsForCourse = items.filter(
    item => item.vaccineCourseId === row.vaccineCourseId
  );
  const doseIndex = itemsForCourse.findIndex(dose => dose.id === row.id);
  const firstNullIndex = itemsForCourse.findIndex(dose => dose.status === null);
  const lastEnteredIndex =
    firstNullIndex === -1 ? itemsForCourse.length - 1 : firstNullIndex - 1;
  // Allow editing if it's the last entered dose or later
  return doseIndex >= lastEnteredIndex;
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
