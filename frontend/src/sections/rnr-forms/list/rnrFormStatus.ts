import { t } from '@/intl';
import type { RnrFormRowFragment } from './rnrForms.generated';

// Status display + editability (spec/rnr-forms/rules.md § status lifecycle):
// DRAFT is the only editable state; FINALISED is terminal.

export const statusLabel = (status: RnrFormRowFragment['status']): string =>
  status === 'FINALISED' ? t('label.finalised') : t('label.draft');

export const isFinalised = (status: RnrFormRowFragment['status']): boolean =>
  status === 'FINALISED';
