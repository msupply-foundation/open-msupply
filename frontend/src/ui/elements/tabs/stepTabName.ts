import { t } from '../../../intl';

/** How far a record has got with one of its steps (see TabDef.step). */
export type StepMark = 'done' | 'current' | 'notStarted';

const markText = (mark: StepMark): string => {
  if (mark === 'done') return t('label.done');
  if (mark === 'current') return t('label.step-current');
  return t('label.step-not-started');
};

/**
 * A step tab's accessible name: its label, its mark and any attention note,
 * in that order, so the name starts with the visible label (SC 2.5.3) and the
 * mark is never carried by the marker's shape and colour alone (SC 1.4.1).
 */
export const stepTabName = (
  label: string,
  mark: StepMark,
  attention?: string
): string => {
  const status = markText(mark);
  return attention
    ? t('label.step-tab-name-attention', { label, status, note: attention })
    : t('label.step-tab-name', { label, status });
};
