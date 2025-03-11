import { DateUtils } from '@common/intl';
import { VaccinationCardItemFragment } from '../../Vaccination/api/operations.generated';
import { getNextVaccinationEncounterDate } from './helpers';

describe('getNextVaccinationEncounterDate', () => {
  it('should return null if there are no items', () => {
    const items: VaccinationCardItemFragment[] = [];
    expect(getNextVaccinationEncounterDate(items)).toBeNull();
  });

  it('should return null if there are no suggested dates', () => {
    const items = [
      { id: '1', suggestedDate: null },
      { id: '2', suggestedDate: null },
    ] as VaccinationCardItemFragment[];
    expect(getNextVaccinationEncounterDate(items)).toBeNull();
  });

  it('should return null if all suggested dates are in the past', () => {
    const items = [
      { id: '1', suggestedDate: '2021-01-01' },
      { id: '2', suggestedDate: '2021-01-02' },
    ] as VaccinationCardItemFragment[];
    expect(getNextVaccinationEncounterDate(items)).toBeNull();
  });

  it('should return the nearest suggested date', () => {
    const oneMonthFromNow = DateUtils.addMonths(new Date(), 1);
    const items = [
      {
        id: '1',
        suggestedDate: DateUtils.addMonths(new Date(), 4).toISOString(),
      },
      {
        id: '2',
        suggestedDate: oneMonthFromNow.toISOString(),
      },
      {
        id: '3',
        suggestedDate: DateUtils.addMonths(new Date(), 2).toISOString(),
      },
    ] as VaccinationCardItemFragment[];
    expect(getNextVaccinationEncounterDate(items)).toEqual(oneMonthFromNow);
  });
});
