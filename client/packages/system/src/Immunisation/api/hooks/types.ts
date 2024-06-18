// re defining DraftVaccineCourse typr yo omit typenames

import {
  VaccineCourseFragment,
  VaccineCourseItemFragment,
} from '../operations.generated';

export type DraftVaccineCourseItem = Omit<
  VaccineCourseItemFragment,
  '__typename'
>;

export type DraftVaccineCourse = Omit<
  VaccineCourseFragment,
  '__typename' | 'vaccineCourseItems'
> & {
  vaccineCourseItems: DraftVaccineCourseItem[] | null;
};
