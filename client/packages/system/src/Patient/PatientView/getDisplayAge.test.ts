import { getDisplayAge } from '../PatientView/getDisplayAge';

describe('getDisplayAge', () => {
  const mockT = (key: string) => key;
  it('returns age in years when patient is over 1 year old or 1 year old', () => {
    // Arrange
    const dob = new Date('01-01-2000');

    // Act
    const result = getDisplayAge(dob, mockT);

    // Assert
    expect(result).toBe('24');
  });

  it('returns age in months and days when patient less than 1 year old', () => {
    const dob = new Date('01-01-2024');

    const result = getDisplayAge(dob, mockT);

    expect(result).toBe('10 months, 14 days');

    expect;
  });
  it('return age in days when patient is less than 1 month old ', () => {
    const dob = new Date('11-01-24');

    const result = getDisplayAge(dob, mockT);

    expect(result).toBe('14 days');
  });
});
