/**
 * @jest-environment ./jest-timezone-environment.js
 * @jest-environment-options {"timezone": "Pacific/Pago_Pago"}
 */
import { calculateDaysUntilExpired } from './utils';

// convert_data's local time is the report's timezone, here UTC-11
describe('days until expired west of UTC', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    // 20:00 on 1 April in Pago Pago, already 2 April in UTC
    jest.setSystemTime(new Date('2024-04-02T07:00:00Z'));
  });
  afterAll(() => {
    jest.useRealTimers();
  });

  // OMS-REG-RPT-05.24
  it('counts from the local date, not the UTC date', () => {
    expect(new Date().getDate()).toBe(1);
    expect(calculateDaysUntilExpired('2024-04-02')).toBe(1);
    expect(calculateDaysUntilExpired('2024-04-01')).toBe(0);
  });
});
