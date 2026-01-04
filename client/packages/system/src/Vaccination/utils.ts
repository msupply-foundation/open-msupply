/**
 * Shared utility functions specific to vaccination
 */

import { VaccinationCardItemNodeStatus } from '@common/types';
import { VaccinationDraft } from './api';
import { VaccinationCardItemFragment } from './api/operations.generated';

// Note: undefined and null have different meanings here
// If it returns undefined, it means there is no previous dose (i.e. it's the first).
// If it returns null, it means the previous dose hasn't been entered at all (neither Given nor Not Given), which means the current dose will be skipping a dose.
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

  const firstAvailableIndex = itemsForCourse.findIndex(
    dose =>
      dose.status === null ||
      dose.status === VaccinationCardItemNodeStatus.Pending ||
      dose.status === VaccinationCardItemNodeStatus.Late
  );

  const lastEnteredIndex =
    firstAvailableIndex === -1
      ? itemsForCourse.length - 1
      : firstAvailableIndex - 1;
  // Allow editing if it's the last entered dose or later (if doses shouldn't be
  // skipped, this will be restricted by not being allowed to open/click the
  // row)
  return (
    doseIndex >= lastEnteredIndex ||
    row.status === VaccinationCardItemNodeStatus.Pending ||
    row.status === VaccinationCardItemNodeStatus.Late
  );
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
