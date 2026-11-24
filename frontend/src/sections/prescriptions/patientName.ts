import { t } from '../../intl';

// The name a dispensing record's patient is shown by. The store's unnamed
// patient is saved with an English name, and every store shares it, so the
// screens show the translated label instead (spec/prescriptions rules › the
// unnamed patient). Labels and reports print the saved name.
export const shownPatientName = (
  name: string,
  isUnnamed: boolean | null | undefined
): string => (isUnnamed ? t('label.unnamed-patient') : name);
