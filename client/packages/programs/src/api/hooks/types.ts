// re defining DraftVaccineCourse type to omit `__typename`s

import {
  VaccineCourseFragment,
  VaccineCourseItemFragment,
  VaccineCourseStoreConfigFragment,
} from '../operations.generated';

export type DraftVaccineCourseItem = Omit<
  VaccineCourseItemFragment,
  '__typename'
>;

export type DraftVaccineCourseStoreConfig = Omit<
  VaccineCourseStoreConfigFragment,
  '__typename'
>;

export type DraftVaccineCourse = Omit<
  VaccineCourseFragment,
  '__typename' | 'vaccineCourseItems' | 'doses' | 'storeConfigs'
> & {
  vaccineCourseItems: DraftVaccineCourseItem[] | null;
  storeConfigs: DraftVaccineCourseStoreConfig[] | null;
};
