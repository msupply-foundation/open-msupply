/**
 * @jest-environment ./jest-timezone-environment.js
 * @jest-environment-options {"timezone": "Pacific/Auckland"}
 */
import { applyDaysLate } from "./utils";

// convert_data's local time is the report's timezone, here UTC+13
describe("days late east of UTC", () => {
  afterAll(() => {
    jest.useRealTimers();
  });

  it("counts the days between local dates, not UTC dates", () => {
    jest.useFakeTimers();
    // 08:00 on 3 April in Auckland, still 2 April in UTC
    jest.setSystemTime(new Date("2024-04-02T19:00:00Z"));
    // 23:00 on 2 April in Auckland, which is 2 April in UTC too
    const result = applyDaysLate([{ startDatetime: "2024-04-02T10:00:00Z" }]);
    expect(result[0].daysLate).toEqual(1);
  });
});
