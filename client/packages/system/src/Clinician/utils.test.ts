import { ClinicianFragment } from '@openmsupply-client/programs';
import { isExistingCode } from './utils';

describe('Clinician utils', () => {
  it('should check if clinician code exists', () => {
    const clinicians = [
      {
        id: '1',
        firstName: 'Jane',
        lastName: 'Doe',
        code: 'JDOE',
      } as ClinicianFragment,
      {
        id: '2',
        firstName: 'John',
        lastName: 'Smith',
        code: 'JSMITH',
      } as ClinicianFragment,
    ];
    expect(isExistingCode(clinicians, 'JDOE')).toBe(true);
    expect(isExistingCode(clinicians, 'JSMITH')).toBe(true);
    expect(isExistingCode(clinicians, 'JDoe')).toBe(true); // case insensitive
    expect(isExistingCode(clinicians, 'UNKNOWN')).toBe(false);
  });
});
