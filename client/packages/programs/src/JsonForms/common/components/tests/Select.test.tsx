import { GenderType, PreferenceKey } from '@openmsupply-client/common';
import { getDisplayOptions } from '../Select';

describe('getDisplayOptions', () => {
  const t = jest.fn(key => key);
  const schemaEnum = ['A', 'B', 'C'];
  it('returns schemaEnum as is', () => {
    const result = getDisplayOptions(t, schemaEnum);
    expect(result).toEqual([
      { label: 'A', value: 'A' },
      { label: 'B', value: 'B' },
      { label: 'C', value: 'C' },
    ]);
  });

  it('returns value from show if it is provided', () => {
    const options = {
      show: [
        ['B', 'Bee'] as [string, string | undefined, ...(string | undefined)[]],
        ['A', 'Ay'] as [string, string | undefined, ...(string | undefined)[]],
      ],
    };
    const result = getDisplayOptions(t, schemaEnum, options);
    expect(result).toEqual([
      { value: 'B', label: 'Bee' },
      { value: 'A', label: 'Ay' },
    ]);
  });

  it('returns preference options when preferenceKey is genderOptions', () => {
    const prefOptions = {
      __typename: 'PreferencesNode',
      genderOptions: [GenderType.Female, GenderType.Male, GenderType.Unknown],
      allowTrackingOfStockByDonor: true,
      manageVaccinesInDoses: true,
      manageVvmStatusForStock: true,
      showContactTracing: true,
      sortByVvmStatusThenExpiry: true,
      useSimplifiedMobileUi: true,
    };
    const options = {
      preferenceKey: PreferenceKey.GenderOptions,
    };
    const result = getDisplayOptions(t, [], options, prefOptions);
    expect(result).toEqual([
      { label: 'gender.female', value: 'FEMALE' },
      { label: 'gender.male', value: 'MALE' },
      { label: 'gender.unknown', value: 'UNKNOWN' },
    ]);
  });
});
