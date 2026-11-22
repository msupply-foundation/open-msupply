import { applyDaysLate, getStatus } from "./utils";

describe("applyDaysLate", () => {
  it("calculates correct diff for late encounter", () => {
    const encounters = [
      { startDatetime: new Date().setDate(new Date().getDate() - 3) },
    ];
    const result = applyDaysLate(encounters);
    expect(result[0].daysLate).toEqual(3);
    expect(result[0].status).toEqual("LATE");
  });

  it("calculates returns 0 days late if in future", () => {
    const encounters = [
      { startDatetime: new Date().setDate(new Date().getDate() + 3) },
    ];
    const result = applyDaysLate(encounters);
    expect(result[0].daysLate).toEqual(0);
    expect(result[0].status).toEqual("");
  });

  it("counts calendar days, not 24-hour periods", () => {
    jest.useFakeTimers();
    try {
      // 10:00 today, for an appointment at 15:00 yesterday (local times)
      jest.setSystemTime(new Date(2024, 3, 2, 10));
      const startDatetime = new Date(2024, 3, 1, 15).toISOString();
      const result = applyDaysLate([{ startDatetime }]);
      expect(result[0].daysLate).toEqual(1);
      expect(result[0].status).toEqual("LATE");
    } finally {
      jest.useRealTimers();
    }
  });
});

describe("getStatus", () => {
  it("gets LTFU when beyond 7 days late", () => {
    expect(getStatus(8)).toEqual("LTFU");
  });

  it("gets LATE when beyond 0 days late", () => {
    expect(getStatus(3)).toEqual("LATE");
  });

  it('gets "" when beyond 0 days late', () => {
    expect(getStatus(0)).toEqual("");
  });
});
