/*
 * The display names of the regimen values, shared by the encounter form that
 * records a regimen and the enrolment form that shows the patient's current
 * one. Typed over the enum, so a regimen the type gains is a compile error
 * here until it has a name.
 *
 * Retired values keep their names too: the archived v1 form lists them, and a
 * program event recorded from a v1 encounter can still carry one.
 */
import { intl } from '../../intl';
import type { DemoRegimen } from './type';
import type { DemoRegimenV1 } from './v1';

export const regimenLabels = (): Record<DemoRegimen, string> => ({
  FIRST_LINE: intl.t('regimen.FIRST_LINE'),
  SECOND_LINE: intl.t('regimen.SECOND_LINE'),
});

/** Every regimen value v1 allowed, the retired one included. */
export const regimenLabelsV1 = (): Record<DemoRegimenV1, string> => ({
  ...regimenLabels(),
  LEGACY_TRIAL: intl.t('regimen.LEGACY_TRIAL'),
});
