// re defining DraftVaccineCourse type to omit `__typename`s

import {
  VaccineCourseFragment,
  VaccineCourseItemFragment,
  VaccineCourseStoreWastageFragment,
} from '../operations.generated';

export type DraftVaccineCourseItem = Omit<
  VaccineCourseItemFragment,
  '__typename'
>;

export type DraftVaccineCourseStoreWastage = Omit<
  VaccineCourseStoreWastageFragment,
  '__typename'
>;

export type DraftVaccineCourse = Omit<
  VaccineCourseFragment,
  '__typename' | 'vaccineCourseItems' | 'doses' | 'storeWastageRates'
> & {
  vaccineCourseItems: DraftVaccineCourseItem[] | null;
  storeWastageRates: DraftVaccineCourseStoreWastage[] | null;
};
