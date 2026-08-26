import { t } from '@/intl';
import type { RnrFormRowFragment } from './rnrForms.generated';

// Status display + editability (spec/rnr-forms/rules.md § status lifecycle):
// DRAFT is the only editable state; FINALISED is terminal.

export const statusLabel = (status: RnrFormRowFragment['status']): string =>
  status === 'FINALISED' ? t('label.finalised') : t('label.draft');

// The S1 chip colours — always --status-* tokens (StatusChip contract),
// colocated with the label per the sibling status modules.
export const STATUS_COLOURS: Record<RnrFormRowFragment['status'], string> = {
  DRAFT: 'var(--status-new)',
  FINALISED: 'var(--status-finalised)',
};

export const isFinalised = (status: RnrFormRowFragment['status']): boolean =>
  status === 'FINALISED';
