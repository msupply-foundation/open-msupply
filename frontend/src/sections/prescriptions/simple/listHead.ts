import type { LocaleKey } from '@/intl';

/*
 * The line under the list's heading, saying who the list is for
 * (spec/prescriptions ui-surface S9 › the list). A visit in progress is a new
 * dispense for whoever is chosen, or for nobody yet; a dispensed visit being
 * edited, like one open on the screen, says who it was for.
 */
export const whoTheListIsFor = (list: {
  /** Who a visit being edited was for (and their code), when one is. */
  editing?: { forName: string | undefined };
  /** Who is chosen for the visit in progress. */
  forName: string | undefined;
}): { key: LocaleKey; name?: string } => {
  if (list.editing)
    return { key: 'label.for-patient', name: list.editing.forName ?? '' };
  if (list.forName === undefined) return { key: 'label.for-not-chosen-yet' };
  return { key: 'label.new-dispense-for', name: list.forName };
};
