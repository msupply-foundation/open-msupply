// re defining DraftVaccineCourse type to omit `__typename`s

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
  '__typename' | 'vaccineCourseItems' | 'doses'
> & {
  vaccineCourseItems: DraftVaccineCourseItem[] | null;
};
