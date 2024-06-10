use std::ops::Neg;

use chrono::{NaiveDate, NaiveDateTime};
use repository::{
    DatetimeFilter, EqualFilter, RepositoryError, StockMovementFilter, StockMovementRepository,
    StockMovementRow, StorageConnection,
};
use util::{constants::NUMBER_OF_DAYS_IN_A_MONTH, date_with_days_offset};

#[derive(Clone, Debug, PartialEq)]
pub struct StockEvolutionOptions {
    pub number_of_historic_data_points: u32,
    pub number_of_projected_data_points: u32,
}

impl Default for StockEvolutionOptions {
    fn default() -> Self {
        Self {
            number_of_historic_data_points: 30,
            number_of_projected_data_points: 20,
        }
    }
}
#[derive(PartialEq, Debug)]
pub struct StockEvolution {
    pub date: NaiveDate,
    pub quantity: f64,
}

pub struct StockEvolutionResult {
    pub projected_stock: Vec<StockEvolution>,
    pub historic_stock: Vec<StockEvolution>,
}

pub fn get_stock_evolution_for_item(
    connection: &StorageConnection,
    store_id: &str,
    item_id: &str,
    reference_datetime: NaiveDateTime,
    reference_stock_on_hand: u32,
    expected_delivery_date: NaiveDate,
    requested_quantity: u32,
    average_monthly_consumption: f64,
    options: StockEvolutionOptions,
) -> Result<StockEvolutionResult, RepositoryError> {
    // Initialise series
    let points = generate_evolution_series(reference_datetime, options);
    // Get rows
    let filter = StockMovementFilter::new()
        .store_id(EqualFilter::equal_to(store_id))
        .item_id(EqualFilter::equal_to(item_id))
        .datetime(DatetimeFilter::date_range(
            points.first_historic_datetime,
            points.last_historic_datetime,
        ));

    let stock_on_hand_rows = StockMovementRepository::new(connection).query(Some(filter))?;
    // Calculate
    Ok(StockEvolutionResult {
        historic_stock: calculate_historic_stock_evolution(
            reference_stock_on_hand,
            points.historic_points,
            stock_on_hand_rows,
        ),
        projected_stock: calculate_projected_stock_evolution(
            reference_stock_on_hand,
            average_monthly_consumption,
            requested_quantity,
            expected_delivery_date,
            points.projected_points,
        ),
    })
}

#[derive(Debug, PartialEq)]
struct StockEvolutionPoints {
    historic_points: Vec<NaiveDate>,
    projected_points: Vec<NaiveDate>,
    first_historic_datetime: NaiveDateTime,
    last_historic_datetime: NaiveDateTime,
}

fn generate_evolution_series(
    reference_datetime: NaiveDateTime,
    StockEvolutionOptions {
        number_of_historic_data_points,
        number_of_projected_data_points,
    }: StockEvolutionOptions,
) -> StockEvolutionPoints {
    let reference_date = reference_datetime.date();
    let last_historic_date = reference_date;
    // -1 point because current reference_datetime is consider a historic data point
    let first_historic_date = date_with_days_offset(
        &reference_date,
        (number_of_historic_data_points as i32 - 1).neg(),
    );

    let mut points = StockEvolutionPoints {
        historic_points: Vec::new(),
        projected_points: Vec::new(),
        first_historic_datetime: first_historic_date.and_hms_opt(0, 0, 0).unwrap(),
        last_historic_datetime: reference_datetime,
    };

    let last_projected_date =
        date_with_days_offset(&reference_date, number_of_projected_data_points as i32);

    let mut off_set = 0;
    loop {
        let reference_date = date_with_days_offset(&first_historic_date, off_set);
        if reference_date > last_projected_date {
            break;
        }
        off_set += 1;

        if reference_date <= last_historic_date {
            points.historic_points.push(reference_date)
        } else {
            points.projected_points.push(reference_date)
        }
    }

    points
}

fn calculate_historic_stock_evolution(
    reference_stock_on_hand: u32,
    mut historic_points: Vec<NaiveDate>,
    stock_on_hand_rows: Vec<StockMovementRow>,
) -> Vec<StockEvolution> {
    let mut result = Vec::new();
    let mut running_stock_on_hand = reference_stock_on_hand as f64;
    // Last point stock on hand should be reference_stock_on_hand
    if let Some(last_point) = historic_points.pop() {
        result.push(StockEvolution {
            date: last_point,
            quantity: reference_stock_on_hand as f64,
        });
    }

    // https://github.com/openmsupply/remote-server/issues/972
    // Historic points are sorted in asc order
    for reference_date in historic_points.into_iter().rev() {
        // On reference_datetime's date we should should have reference_stock_on_hand
        // SOH at the start of next day is current day SOH
        let next_day = date_with_days_offset(&reference_date, 1);
        let day_movements = stock_on_hand_rows.iter().fold(0.0, |movement, row| {
            if within_range(next_day, row.datetime) {
                movement + row.quantity
            } else {
                movement
            }
        });
        // Reverse ledger thus substraction
        running_stock_on_hand -= day_movements;
        result.push(StockEvolution {
            date: reference_date,
            quantity: running_stock_on_hand,
        })
    }

    // Reverse
    result.into_iter().rev().collect()
}

fn calculate_projected_stock_evolution(
    reference_stock_on_hand: u32,
    average_monthly_consumption: f64,
    requested_quantity: u32,
    expected_delivery_date: NaiveDate,
    projected_points: Vec<NaiveDate>,
) -> Vec<StockEvolution> {
    let average_daily_consumption = average_monthly_consumption / NUMBER_OF_DAYS_IN_A_MONTH;
    let mut result = Vec::new();
    let mut running_stock_on_hand = reference_stock_on_hand as f64;
    for reference_date in projected_points.into_iter() {
        if reference_date == expected_delivery_date {
            running_stock_on_hand += requested_quantity as f64;
        }
        running_stock_on_hand -= average_daily_consumption;

        if running_stock_on_hand < 0.0 {
            running_stock_on_hand = 0.0;
        }

        result.push(StockEvolution {
            date: reference_date,
            quantity: running_stock_on_hand,
        });
    }

    result
}

fn within_range(within_date: NaiveDate, datetime: NaiveDateTime) -> bool {
    within_date.and_hms_opt(0, 0, 0).unwrap() <= datetime
        && datetime
            <= date_with_days_offset(&within_date, 1)
                .and_hms_opt(0, 0, 0)
                .unwrap()
}

#[cfg(test)]
mod tests {
    use super::*;
    use util::inline_init;

    #[test]
    fn test_generate_series() {
        assert_eq!(
            generate_evolution_series(
                NaiveDate::from_ymd_opt(2021, 1, 2)
                    .unwrap()
                    .and_hms_opt(12, 10, 11)
                    .unwrap(),
                StockEvolutionOptions {
                    number_of_historic_data_points: 3,
                    number_of_projected_data_points: 4
                }
            ),
            StockEvolutionPoints {
                historic_points: vec![
                    NaiveDate::from_ymd_opt(2020, 12, 31).unwrap(),
                    NaiveDate::from_ymd_opt(2021, 1, 1).unwrap(),
                    NaiveDate::from_ymd_opt(2021, 1, 2).unwrap(),
                ],
                projected_points: vec![
                    NaiveDate::from_ymd_opt(2021, 1, 3).unwrap(),
                    NaiveDate::from_ymd_opt(2021, 1, 4).unwrap(),
                    NaiveDate::from_ymd_opt(2021, 1, 5).unwrap(),
                    NaiveDate::from_ymd_opt(2021, 1, 6).unwrap(),
                ],
                first_historic_datetime: NaiveDate::from_ymd_opt(2020, 12, 31)
                    .unwrap()
                    .and_hms_opt(0, 0, 0)
                    .unwrap(),
                last_historic_datetime: NaiveDate::from_ymd_opt(2021, 1, 2)
                    .unwrap()
                    .and_hms_opt(12, 10, 11)
                    .unwrap()
            }
        );
    }

    #[test]
    fn test_calculate_historic() {
        assert_eq!(
            calculate_historic_stock_evolution(
                30,
                vec![
                    NaiveDate::from_ymd_opt(2020, 12, 31).unwrap(),
                    NaiveDate::from_ymd_opt(2021, 1, 1).unwrap(),
                    NaiveDate::from_ymd_opt(2021, 1, 2).unwrap(),
                ],
                vec![
                    inline_init(|r: &mut StockMovementRow| {
                        r.quantity = 10.0;
                        r.datetime = NaiveDate::from_ymd_opt(2021, 1, 2)
                            .unwrap()
                            .and_hms_opt(10, 0, 0)
                            .unwrap();
                    }),
                    inline_init(|r: &mut StockMovementRow| {
                        r.quantity = -20.0;
                        r.datetime = NaiveDate::from_ymd_opt(2021, 1, 2)
                            .unwrap()
                            .and_hms_opt(7, 0, 0)
                            .unwrap();
                    }),
                    inline_init(|r: &mut StockMovementRow| {
                        r.quantity = 15.0;
                        r.datetime = NaiveDate::from_ymd_opt(2021, 1, 1)
                            .unwrap()
                            .and_hms_opt(2, 0, 0)
                            .unwrap();
                    }),
                    inline_init(|r: &mut StockMovementRow| {
                        r.quantity = 7.0;
                        r.datetime = NaiveDate::from_ymd_opt(2021, 1, 1)
                            .unwrap()
                            .and_hms_opt(2, 0, 0)
                            .unwrap();
                    }),
                    // Not counted
                    inline_init(|r: &mut StockMovementRow| {
                        r.quantity = -20.0;
                        r.datetime = NaiveDate::from_ymd_opt(2020, 12, 31)
                            .unwrap()
                            .and_hms_opt(2, 0, 0)
                            .unwrap();
                    }),
                    // Not counted
                    inline_init(|r: &mut StockMovementRow| {
                        r.quantity = -100.0;
                        r.datetime = NaiveDate::from_ymd_opt(2021, 1, 3)
                            .unwrap()
                            .and_hms_opt(2, 0, 0)
                            .unwrap();
                    })
                ]
            ),
            vec![
                StockEvolution {
                    date: NaiveDate::from_ymd_opt(2020, 12, 31).unwrap(),
                    quantity: 18.0 // (40) - 15 - 7 = (18)
                },
                StockEvolution {
                    date: NaiveDate::from_ymd_opt(2021, 1, 1).unwrap(),
                    quantity: 40.0 // 30 - 10 + 20 = (40)
                },
                StockEvolution {
                    date: NaiveDate::from_ymd_opt(2021, 1, 2).unwrap(),
                    quantity: 30.0 // initial
                }
            ]
        );
    }

    #[test]
    fn test_calculate_projected() {
        assert_eq!(
            calculate_projected_stock_evolution(
                30,
                25.5 * NUMBER_OF_DAYS_IN_A_MONTH, // amc
                100,
                NaiveDate::from_ymd_opt(2021, 1, 5).unwrap(),
                vec![
                    NaiveDate::from_ymd_opt(2021, 1, 3).unwrap(),
                    NaiveDate::from_ymd_opt(2021, 1, 4).unwrap(),
                    NaiveDate::from_ymd_opt(2021, 1, 5).unwrap(),
                    NaiveDate::from_ymd_opt(2021, 1, 6).unwrap(),
                ]
            ),
            vec![
                StockEvolution {
                    date: NaiveDate::from_ymd_opt(2021, 1, 3).unwrap(),
                    quantity: 4.5 // 30 - 25.5 - 4.5
                },
                StockEvolution {
                    date: NaiveDate::from_ymd_opt(2021, 1, 4).unwrap(),
                    quantity: 0.0 // (4.5) - 25.5 = -something, but we set to (0)
                },
                StockEvolution {
                    date: NaiveDate::from_ymd_opt(2021, 1, 5).unwrap(),
                    quantity: 74.5 // (0) - 25.5 + 50 = (74.5), adding suggested
                },
                StockEvolution {
                    date: NaiveDate::from_ymd_opt(2021, 1, 6).unwrap(),
                    quantity: 49.0 // (74.5) - 25.5 = 49.0
                },
            ]
        );
    }
}
