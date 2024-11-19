// import { DateUtils } from '@common/intl';

// describe('getDisplayAge', () => {
//   it('returns age in years when patient is over 1 year old or 1 year old', () => {
//     // This is checking to see that mockT is not being called and that an age > 1 will pass
//     const mockT = jest.fn();
//     const today = new Date();
//     const dob = DateUtils.addYears(today, -9);
//     const result = getDisplayAge(dob, mockT);

//     expect(mockT).not.toHaveBeenCalled();
//     expect(result).toBe('9');
//   });

//   it('returns age in months and days when patient less than 1 year old', () => {
//     // This is checking to see that mockT is called and that it returns a months and days label and months and days counts
//     const mockT = jest.fn();
//     const today = new Date();
//     const threeMonthsAgo = DateUtils.addMonths(today, -3);
//     const dob = DateUtils.addDays(threeMonthsAgo, -2);

//     getDisplayAge(dob, mockT);

//     expect(mockT).toHaveBeenCalledWith('label.age-months-and', { count: 3 });
//     expect(mockT).toHaveBeenCalledWith('label.age-days', { count: 2 });
//   });

//   it('return age in days when patient is less than 1 month old ', () => {
//     // This is checking to see that mockT is called and that it returns days label and count of days
//     const mockT = jest.fn();
//     const today = new Date();
//     const dob = DateUtils.addDays(today, -10);

//     getDisplayAge(dob, mockT);

//     expect(mockT).toHaveBeenCalledWith('label.age-days', { count: 10 });
//   });
// });
