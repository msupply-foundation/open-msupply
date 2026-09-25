/*
 * The display names of the regimen values, shared by the encounter form that
 * records a regimen and the enrolment form that shows the patient's current
 * one. Typed over the enum, so a regimen the type gains is a compile error
 * here until it has a name.
 */
import { intl } from '../../intl';
import type { DemoRegimen } from './type';

export const regimenLabels = (): Record<DemoRegimen, string> => ({
  FIRST_LINE: intl.t('regimen.FIRST_LINE'),
  SECOND_LINE: intl.t('regimen.SECOND_LINE'),
});
