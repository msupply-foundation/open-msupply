// re defining DraftVaccineCourse typr yo omit typenames

import {
  VaccineCourseFragment,
  VaccineCourseItemFragment,
  VaccineItemDetailsFragment,
} from '../operations.generated';

export type DraftVaccineItemDetails = Omit<
  VaccineItemDetailsFragment,
  '__typename'
>;

export type DraftVaccineCourseItem = Omit<
  VaccineCourseItemFragment,
  '__typename' | 'item'
> & { item: DraftVaccineItemDetails };

export type DraftVaccineCourse = Omit<
  VaccineCourseFragment,
  '__typename' | 'vaccineCourseItems'
> & {
  vaccineCourseItems: DraftVaccineCourseItem[] | null;
};
