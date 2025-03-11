import { VaccinationCardItemFragment } from '../../Vaccination/api/operations.generated';

export function getNextVaccinationEncounterDate(
  items: VaccinationCardItemFragment[]
): Date | null {
  const nextSuggestedDate = items.reduce<Date | null>(
    (nextSuggestedDate, vaccination) => {
      if (!vaccination.suggestedDate) return nextSuggestedDate;

      const vaccinationDate = new Date(vaccination.suggestedDate);

      if (vaccinationDate < new Date()) return nextSuggestedDate;

      if (!nextSuggestedDate || vaccinationDate < nextSuggestedDate) {
        return vaccinationDate;
      }
      return nextSuggestedDate;
    },
    null
  );

  return nextSuggestedDate;
}
