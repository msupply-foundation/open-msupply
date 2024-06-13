use std::ops::Neg;

use chrono::NaiveDate;
use repository::{
    ConsumptionFilter, ConsumptionRepository, ConsumptionRow, DateFilter, EqualFilter,
    RepositoryError, StorageConnection,
};
use util::{
    constants::{DEFAULT_AMC_LOOKBACK_MONTHS, NUMBER_OF_DAYS_IN_A_MONTH},
    date_with_months_offset, first_day_of_the_month, last_day_of_the_month,
};

#[derive(Clone, Debug, PartialEq)]
pub struct ConsumptionHistoryOptions {
    pub amc_lookback_months: u32,
    pub number_of_data_points: u32,
}

impl Default for ConsumptionHistoryOptions {
    fn default() -> Self {
        Self {
            amc_lookback_months: DEFAULT_AMC_LOOKBACK_MONTHS,
            number_of_data_points: 12,
        }
    }
}

#[derive(Debug, PartialEq)]
pub struct ConsumptionHistory {
    pub consumption: u32,
    pub average_monthly_consumption: f64,
    pub date: NaiveDate,
}

pub fn get_historic_consumption_for_item(
    connection: &StorageConnection,
    store_id: &str,
    item_id: &str,
    reference_date: NaiveDate,
    options: ConsumptionHistoryOptions,
) -> Result<Vec<ConsumptionHistory>, RepositoryError> {
    // Initialise series
    let points = generate_consumption_series(reference_date, options);
    // Get rows
    let filter = ConsumptionFilter::new()
        .store_id(EqualFilter::equal_to(store_id))
        .item_id(EqualFilter::equal_to(item_id))
        .date(DateFilter::date_range(
            &points.first_date,
            &points.last_date,
        ));

    let consumption_rows = ConsumptionRepository::new(connection).query(Some(filter))?;
    // Calculate historic consumption
    let result = points
        .rows
        .into_iter()
        .map(|point| calculate_consumption(point, &consumption_rows))
        .collect();

    Ok(result)
}

#[derive(Debug, PartialEq)]
struct ConsumptionHistoryPoint {
    reference_date: NaiveDate,
    start_of_consumption_lookup: NaiveDate,
    end_of_consumption_lookup: NaiveDate,
    start_of_amc_lookup: NaiveDate,
    end_of_amc_lookup: NaiveDate,
}
#[derive(Debug, PartialEq)]
struct ConsumptionHistoryPoints {
    rows: Vec<ConsumptionHistoryPoint>,
    first_date: NaiveDate,
    last_date: NaiveDate,
}

fn generate_consumption_series(
    reference_date: NaiveDate,
    ConsumptionHistoryOptions {
        amc_lookback_months,
        number_of_data_points,
    }: ConsumptionHistoryOptions,
) -> ConsumptionHistoryPoints {
    // reference_date is counted as the first month data point
    let data_point_offset = (number_of_data_points as i32 - 1).neg();
    // current month as a whole is counted in historic amc calculation
    let amc_calculation_offset = (amc_lookback_months as i32 - 1).neg();

    let first_data_point_date =
        first_day_of_the_month(&date_with_months_offset(&reference_date, data_point_offset));

    let mut points = ConsumptionHistoryPoints {
        rows: Vec::new(),
        last_date: last_day_of_the_month(&reference_date),
        first_date: first_day_of_the_month(&date_with_months_offset(
            &first_data_point_date,
            amc_calculation_offset,
        )),
    };

    let mut off_set = 0;
    loop {
        let reference_date =
            last_day_of_the_month(&date_with_months_offset(&first_data_point_date, off_set));
        if reference_date > points.last_date {
            break;
        }

        points.rows.push(ConsumptionHistoryPoint {
            reference_date,
            start_of_consumption_lookup: first_day_of_the_month(&reference_date),
            end_of_consumption_lookup: reference_date,
            start_of_amc_lookup: first_day_of_the_month(&date_with_months_offset(
                &reference_date,
                amc_calculation_offset,
            )),
            end_of_amc_lookup: reference_date,
        });
        off_set += 1;
    }

    points
}

fn calculate_consumption(
    ConsumptionHistoryPoint {
        reference_date,
        start_of_consumption_lookup,
        end_of_consumption_lookup,
        start_of_amc_lookup,
        end_of_amc_lookup,
    }: ConsumptionHistoryPoint,
    consumption_rows: &Vec<ConsumptionRow>,
) -> ConsumptionHistory {
    // https://github.com/openmsupply/remote-server/issues/972
    let total_consumption_amc = consumption_rows.iter().fold(0.0, |sum, row| {
        if within_range(&start_of_amc_lookup, &end_of_amc_lookup, &row.date) {
            sum + row.quantity
        } else {
            sum
        }
    });
    let days_in_amc_lookup = (end_of_amc_lookup - start_of_amc_lookup).num_days();

    let consumption = consumption_rows.iter().fold(0.0, |sum, row| {
        if within_range(
            &start_of_consumption_lookup,
            &end_of_consumption_lookup,
            &row.date,
        ) {
            sum + row.quantity
        } else {
            sum
        }
    }) as u32;

    ConsumptionHistory {
        consumption,
        average_monthly_consumption: total_consumption_amc / days_in_amc_lookup as f64
            * NUMBER_OF_DAYS_IN_A_MONTH,
        date: reference_date,
    }
}

fn within_range(from_date: &NaiveDate, to_date: &NaiveDate, date: &NaiveDate) -> bool {
    from_date <= date && date <= to_date
}

#[cfg(test)]
mod tests {
    use super::*;
    use util::inline_init;

    #[test]
    fn test_generate_series() {
        assert_eq!(
            generate_consumption_series(
                NaiveDate::from_ymd_opt(2021, 1, 4).unwrap(),
                ConsumptionHistoryOptions {
                    amc_lookback_months: 5,
                    number_of_data_points: 3
                }
            ),
            ConsumptionHistoryPoints {
                first_date: NaiveDate::from_ymd_opt(2020, 7, 1).unwrap(),
                last_date: NaiveDate::from_ymd_opt(2021, 1, 31).unwrap(),
                rows: vec![
                    ConsumptionHistoryPoint {
                        reference_date: NaiveDate::from_ymd_opt(2020, 11, 30).unwrap(),
                        start_of_consumption_lookup: NaiveDate::from_ymd_opt(2020, 11, 1).unwrap(),
                        end_of_consumption_lookup: NaiveDate::from_ymd_opt(2020, 11, 30).unwrap(),
                        start_of_amc_lookup: NaiveDate::from_ymd_opt(2020, 7, 1).unwrap(),
                        end_of_amc_lookup: NaiveDate::from_ymd_opt(2020, 11, 30).unwrap(),
                    },
                    ConsumptionHistoryPoint {
                        reference_date: NaiveDate::from_ymd_opt(2020, 12, 31).unwrap(),
                        start_of_consumption_lookup: NaiveDate::from_ymd_opt(2020, 12, 1).unwrap(),
                        end_of_consumption_lookup: NaiveDate::from_ymd_opt(2020, 12, 31).unwrap(),
                        start_of_amc_lookup: NaiveDate::from_ymd_opt(2020, 8, 1).unwrap(),
                        end_of_amc_lookup: NaiveDate::from_ymd_opt(2020, 12, 31).unwrap(),
                    },
                    ConsumptionHistoryPoint {
                        reference_date: NaiveDate::from_ymd_opt(2021, 1, 31).unwrap(),
                        start_of_consumption_lookup: NaiveDate::from_ymd_opt(2021, 1, 1).unwrap(),
                        end_of_consumption_lookup: NaiveDate::from_ymd_opt(2021, 1, 31).unwrap(),
                        start_of_amc_lookup: NaiveDate::from_ymd_opt(2020, 9, 1).unwrap(),
                        end_of_amc_lookup: NaiveDate::from_ymd_opt(2021, 1, 31).unwrap(),
                    }
                ]
            }
        );
    }

    #[test]
    fn test_calculate_consumption() {
        assert_eq!(
            calculate_consumption(
                ConsumptionHistoryPoint {
                    reference_date: NaiveDate::from_ymd_opt(2021, 1, 31).unwrap(),
                    start_of_consumption_lookup: NaiveDate::from_ymd_opt(2021, 1, 1).unwrap(),
                    end_of_consumption_lookup: NaiveDate::from_ymd_opt(2021, 1, 31).unwrap(),
                    start_of_amc_lookup: NaiveDate::from_ymd_opt(2020, 10, 1).unwrap(),
                    end_of_amc_lookup: NaiveDate::from_ymd_opt(2021, 1, 31).unwrap(),
                },
                &vec![
                    inline_init(|r: &mut ConsumptionRow| {
                        r.date = NaiveDate::from_ymd_opt(2021, 2, 1).unwrap();
                        r.quantity = 1000.0;
                    }),
                    inline_init(|r: &mut ConsumptionRow| {
                        r.date = NaiveDate::from_ymd_opt(2021, 1, 31).unwrap();
                        r.quantity = 10.0;
                    }),
                    inline_init(|r: &mut ConsumptionRow| {
                        r.date = NaiveDate::from_ymd_opt(2021, 1, 20).unwrap();
                        r.quantity = 10.0;
                    }),
                    inline_init(|r: &mut ConsumptionRow| {
                        r.date = NaiveDate::from_ymd_opt(2020, 12, 3).unwrap();
                        r.quantity = 10.0;
                    }),
                    inline_init(|r: &mut ConsumptionRow| {
                        r.date = NaiveDate::from_ymd_opt(2020, 12, 2).unwrap();
                        r.quantity = 10.0;
                    }),
                    inline_init(|r: &mut ConsumptionRow| {
                        r.date = NaiveDate::from_ymd_opt(2020, 11, 11).unwrap();
                        r.quantity = 10.0;
                    }),
                    inline_init(|r: &mut ConsumptionRow| {
                        r.date = NaiveDate::from_ymd_opt(2020, 10, 5).unwrap();
                        r.quantity = 10.0;
                    }),
                    inline_init(|r: &mut ConsumptionRow| {
                        r.date = NaiveDate::from_ymd_opt(2020, 10, 7).unwrap();
                        r.quantity = 10.0;
                    }),
                    inline_init(|r: &mut ConsumptionRow| {
                        r.date = NaiveDate::from_ymd_opt(2020, 10, 1).unwrap();
                        r.quantity = 10.0;
                    }),
                    inline_init(|r: &mut ConsumptionRow| {
                        r.date = NaiveDate::from_ymd_opt(2020, 9, 30).unwrap();
                        r.quantity = 1000.0;
                    }),
                    inline_init(|r: &mut ConsumptionRow| {
                        r.date = NaiveDate::from_ymd_opt(2020, 2, 10).unwrap();
                        r.quantity = 1000.0;
                    })
                ]
            ),
            ConsumptionHistory {
                consumption: 20,
                average_monthly_consumption: 80_f64
                    / (NaiveDate::from_ymd_opt(2021, 1, 31).unwrap()
                        - NaiveDate::from_ymd_opt(2020, 10, 1).unwrap())
                    .num_days() as f64
                    * NUMBER_OF_DAYS_IN_A_MONTH,
                date: NaiveDate::from_ymd_opt(2021, 1, 31).unwrap()
            }
        );
    }
}
