import { describe, expect, it } from 'vitest';
import { whoTheListIsFor } from './listHead';

// spec/prescriptions ui-surface S9 › the list
describe('who the list says it is for', () => {
  // OMS-REG-DIS-12.22
  it('is nobody yet before anyone is chosen', () => {
    expect(whoTheListIsFor({ forName: undefined })).toEqual({
      key: 'label.for-not-chosen-yet',
    });
  });

  // OMS-REG-DIS-12.361, .23, .201
  it('is a new dispense for whoever is chosen', () => {
    expect(whoTheListIsFor({ forName: 'Malfoy, Draco' })).toEqual({
      key: 'label.new-dispense-for',
      name: 'Malfoy, Draco',
    });
  });

  // OMS-REG-DIS-12.285: a visit being edited says who it was for, as an
  // open one does, whoever is chosen meanwhile.
  it('is who the visit was for while it is edited', () => {
    expect(
      whoTheListIsFor({
        editing: { forName: 'Malfoy, Draco · DM1' },
        forName: 'Weasley, Ron',
      })
    ).toEqual({ key: 'label.for-patient', name: 'Malfoy, Draco · DM1' });
  });
});
