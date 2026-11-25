import { PreferenceKey } from '@openmsupply-client/common';
import { withoutNewFrontEndOnly } from './utils';

describe('withoutNewFrontEndOnly', () => {
  it('leaves out the dispensing preferences only the new front end sets (#2188)', () => {
    const listed = [
      PreferenceKey.AuthorisePurchaseOrder,
      PreferenceKey.DispensingScreen,
      PreferenceKey.UseUnnamedPatient,
      PreferenceKey.StartWithUnnamedPatient,
      PreferenceKey.AskForPatientType,
      PreferenceKey.DaysInMonth,
    ].map(key => ({ key }));

    expect(withoutNewFrontEndOnly(listed).map(pref => pref.key)).toEqual([
      PreferenceKey.AuthorisePurchaseOrder,
      PreferenceKey.DaysInMonth,
    ]);
  });
});
