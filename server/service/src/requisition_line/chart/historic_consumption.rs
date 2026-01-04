use std::ops::Neg;

use chrono::NaiveDate;
use repository::{
    ConsumptionFilter, ConsumptionRepository, ConsumptionRow, DateFilter, DaysOutOfStockFilter,
    DaysOutOfStockRepository, EqualFilter, RepositoryError, StorageConnection,
};
use util::{date_with_months_offset, first_day_of_the_month, last_day_of_the_month};

use crate::{
    common::days_in_a_month,
    preference::{AdjustForNumberOfDaysOutOfStock, Preference},
};

#[derive(Clone, Debug, PartialEq)]
pub struct ConsumptionHistoryOptions {
    pub amc_lookback_months: f64,
    pub number_of_data_points: u32,
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
    let consumption_filter = ConsumptionFilter::new()
        .store_id(EqualFilter::equal_to(store_id.to_string()))
        .item_id(EqualFilter::equal_to(item_id.to_string()))
        .date(DateFilter::date_range(
            &points.first_date,
            &points.last_date,
        ));

    let consumption_rows =
        ConsumptionRepository::new(connection).query(Some(consumption_filter))?;

    let days_in_month: f64 = days_in_a_month(connection);

    let adjust_for_days_out_of_stock = AdjustForNumberOfDaysOutOfStock
        .load(connection, None)
        .unwrap_or(false);

    let dos_filter = DaysOutOfStockFilter {
        store_id: Some(EqualFilter::equal_to(store_id.to_string())),
        item_id: Some(EqualFilter::equal_to(item_id.to_string())),
        from: points.first_date,
        to: points.last_date,
    };

    let adjusted_days_out_of_stock = if adjust_for_days_out_of_stock {
        calculate_adjusted_days_out_of_stock(
            connection,
            dos_filter,
            days_in_month,
            adjust_for_days_out_of_stock,
        )?
    } else {
        1.0
    };

    let result = points
        .rows
        .into_iter()
        .map(|point| {
            calculate_consumption(
                point,
                &consumption_rows,
                days_in_month,
                adjusted_days_out_of_stock,
            )
        })
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
    days_in_month: f64,
    adjusted_days_out_of_stock: f64,
) -> ConsumptionHistory {
    // https://github.com/openmsupply/remote-server/issues/972
    let total_consumption_amc = consumption_rows.iter().fold(0.0, |sum, row| {
        if within_range(&start_of_amc_lookup, &end_of_amc_lookup, &row.date) {
            sum + row.quantity
        } else {
            sum
        }
    });

    let amc_months = (end_of_amc_lookup - start_of_amc_lookup).num_days() as f64 / days_in_month;

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
        average_monthly_consumption: calculate_amc(
            total_consumption_amc,
            amc_months,
            adjusted_days_out_of_stock,
        ),
        date: reference_date,
    }
}

fn calculate_amc(total_consumption: f64, amc_months: f64, adjusted_days_out_of_stock: f64) -> f64 {
    (total_consumption / amc_months) * adjusted_days_out_of_stock
}

fn calculate_adjusted_days_out_of_stock(
    connection: &StorageConnection,
    filter: DaysOutOfStockFilter,
    days_in_month: f64,
    adjust_for_days_out_of_stock: bool,
) -> Result<f64, RepositoryError> {
    if !adjust_for_days_out_of_stock {
        return Ok(1.0);
    }

    let dos = DaysOutOfStockRepository::new(connection)
        .query(filter)?
        .first()
        .map_or(0.0, |row| row.total_dos);

    Ok(days_in_month / (days_in_month - dos))
}

fn within_range(from_date: &NaiveDate, to_date: &NaiveDate, date: &NaiveDate) -> bool {
    from_date <= date && date <= to_date
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    #[test]
    fn test_generate_series() {
        assert_eq!(
            generate_consumption_series(
                NaiveDate::from_ymd_opt(2021, 1, 4).unwrap(),
                ConsumptionHistoryOptions {
                    amc_lookback_months: 5.0,
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

    #[actix_rt::test]
    async fn test_calculate_consumption() {
        let (_, connection, _, _) =
            setup_all("calculate historic consumption", MockDataInserts::none()).await;
        let days_in_month: f64 = days_in_a_month(&connection);

        let mut adjust_for_dos = 1.0; // item in stock on all days

        fn amc_months_helper(
            end_of_amc_lookup: NaiveDate,
            start_of_amc_lookup: NaiveDate,
            days_in_month: f64,
        ) -> f64 {
            (end_of_amc_lookup - start_of_amc_lookup).num_days() as f64 / days_in_month
        }

        let consumption_rows = vec![
            ConsumptionRow {
                date: NaiveDate::from_ymd_opt(2021, 2, 1).unwrap(),
                quantity: 1000.0,
                ..Default::default()
            },
            ConsumptionRow {
                date: NaiveDate::from_ymd_opt(2021, 1, 31).unwrap(),
                quantity: 10.0,
                ..Default::default()
            },
            ConsumptionRow {
                date: NaiveDate::from_ymd_opt(2021, 1, 20).unwrap(),
                quantity: 10.0,
                ..Default::default()
            },
            ConsumptionRow {
                date: NaiveDate::from_ymd_opt(2020, 12, 3).unwrap(),
                quantity: 10.0,
                ..Default::default()
            },
            ConsumptionRow {
                date: NaiveDate::from_ymd_opt(2020, 12, 2).unwrap(),
                quantity: 10.0,
                ..Default::default()
            },
            ConsumptionRow {
                date: NaiveDate::from_ymd_opt(2020, 11, 11).unwrap(),
                quantity: 10.0,
                ..Default::default()
            },
            ConsumptionRow {
                date: NaiveDate::from_ymd_opt(2020, 10, 5).unwrap(),
                quantity: 10.0,
                ..Default::default()
            },
            ConsumptionRow {
                date: NaiveDate::from_ymd_opt(2020, 10, 7).unwrap(),
                quantity: 10.0,
                ..Default::default()
            },
            ConsumptionRow {
                date: NaiveDate::from_ymd_opt(2020, 10, 1).unwrap(),
                quantity: 10.0,
                ..Default::default()
            },
            ConsumptionRow {
                date: NaiveDate::from_ymd_opt(2020, 9, 30).unwrap(),
                quantity: 1000.0,
                ..Default::default()
            },
            ConsumptionRow {
                date: NaiveDate::from_ymd_opt(2020, 2, 10).unwrap(),
                quantity: 1000.0,
                ..Default::default()
            },
        ];

        let start_date = NaiveDate::from_ymd_opt(2021, 1, 1).unwrap();
        let end_date = NaiveDate::from_ymd_opt(2021, 1, 31).unwrap();
        let amc_start = NaiveDate::from_ymd_opt(2020, 10, 1).unwrap();
        let end_of_amc = end_date;

        assert_eq!(
            calculate_consumption(
                ConsumptionHistoryPoint {
                    reference_date: end_date,
                    start_of_consumption_lookup: start_date,
                    end_of_consumption_lookup: end_date,
                    start_of_amc_lookup: amc_start,
                    end_of_amc_lookup: end_of_amc,
                },
                &consumption_rows,
                days_in_month,
                adjust_for_dos
            ),
            ConsumptionHistory {
                consumption: 20,
                average_monthly_consumption: 80_f64
                    / amc_months_helper(end_of_amc, amc_start, days_in_month)
                    * adjust_for_dos,
                date: end_date
            }
        );

        adjust_for_dos = 1.5; // 1/3 of days out of stock eg 10 days out of 30

        assert_eq!(
            calculate_consumption(
                ConsumptionHistoryPoint {
                    reference_date: end_date,
                    start_of_consumption_lookup: start_date,
                    end_of_consumption_lookup: end_date,
                    start_of_amc_lookup: amc_start,
                    end_of_amc_lookup: end_of_amc,
                },
                &consumption_rows,
                days_in_month,
                adjust_for_dos
            ),
            ConsumptionHistory {
                consumption: 20,
                average_monthly_consumption: 80_f64
                    / amc_months_helper(end_of_amc, amc_start, days_in_month)
                    * adjust_for_dos,
                date: end_date
            }
        );
    }
}
