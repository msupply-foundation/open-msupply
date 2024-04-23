use chrono::NaiveDateTime;
use repository::{
    temperature_chart_row::Interval, EqualFilter, RepositoryError, TemperatureChartRepository,
    TemperatureChartRow, TemperatureLogFilter,
};
use util::{datetime_with_offset, uuid};

use crate::service_provider::ServiceContext;

const MAX_NUMBER_OF_DATA_POINTS: i32 = 100;

#[derive(Debug, PartialEq)]
pub enum TemperatureChartError {
    TooManyDataPoints,
    AtLeastThreeDataPoints,
    ToDateTimeMustBeAfterFromDatetime,
    DatabaseError(RepositoryError),
}

#[derive(Debug, PartialEq)]
pub struct TemperatureChart {
    pub temperature_chart_rows: Vec<TemperatureChartRow>,
    pub intervals: Vec<Interval>,
}

#[derive(Clone, Debug, PartialEq)]
pub struct TemperatureChartInput {
    pub from_datetime: NaiveDateTime,
    pub to_datetime: NaiveDateTime,
    pub number_of_data_points: i32,
    pub filter: Option<TemperatureLogFilter>,
}

pub trait TemperatureChartServiceTrait: Sync + Send {
    fn get_temperature_chart(
        &self,
        ctx: &ServiceContext,
        TemperatureChartInput {
            from_datetime,
            to_datetime,
            number_of_data_points,
            filter,
        }: TemperatureChartInput,
    ) -> Result<TemperatureChart, TemperatureChartError> {
        get_temperature_chart(
            ctx,
            from_datetime,
            to_datetime,
            number_of_data_points,
            filter,
        )
    }
}

pub fn get_temperature_chart(
    ctx: &ServiceContext,
    from_datetime: NaiveDateTime,
    to_datetime: NaiveDateTime,
    number_of_data_points: i32,
    filter: Option<TemperatureLogFilter>,
) -> Result<TemperatureChart, TemperatureChartError> {
    validate(from_datetime, to_datetime, number_of_data_points)?;
    let intervals = calculate_intervals(from_datetime, to_datetime, number_of_data_points);

    // Always filter by store_id
    let filter = filter
        .map(TemperatureLogFilter::from)
        .unwrap_or_default()
        .store_id(EqualFilter::equal_to(&ctx.store_id));

    let temperature_chart_rows =
        TemperatureChartRepository::new(&ctx.connection).query(intervals.clone(), Some(filter))?;

    Ok(TemperatureChart {
        temperature_chart_rows,
        intervals,
    })
}

pub struct TemperatureChartService;
impl TemperatureChartServiceTrait for TemperatureChartService {}

impl From<RepositoryError> for TemperatureChartError {
    fn from(error: RepositoryError) -> Self {
        Self::DatabaseError(error)
    }
}

fn validate(
    from_datetime: NaiveDateTime,
    to_datetime: NaiveDateTime,
    number_of_data_points: i32,
) -> Result<(), TemperatureChartError> {
    if from_datetime >= to_datetime {
        return Err(TemperatureChartError::ToDateTimeMustBeAfterFromDatetime);
    }

    if number_of_data_points < 3 {
        return Err(TemperatureChartError::AtLeastThreeDataPoints);
    }

    if number_of_data_points > MAX_NUMBER_OF_DATA_POINTS {
        return Err(TemperatureChartError::TooManyDataPoints);
    }

    Ok(())
}

fn calculate_intervals(
    from_datetime: NaiveDateTime,
    to_datetime: NaiveDateTime,
    number_of_data_points: i32,
) -> Vec<Interval> {
    let interval = (to_datetime - from_datetime) / number_of_data_points;
    (0..number_of_data_points)
        .map(|point| Interval {
            from_datetime: datetime_with_offset(&from_datetime, interval * point),
            to_datetime: datetime_with_offset(&from_datetime, interval * (point + 1)),
            interval_id: uuid::uuid(),
        })
        .collect()
}

#[cfg(test)]
mod test {
    use crate::test_helpers::{setup_all_and_service_provider, ServiceTestContext};

    use super::*;
    use chrono::Duration;
    use repository::mock::MockDataInserts;
    use util::*;
    #[test]
    fn test_calculate_intervals() {
        // Test 1: 5 Intervals in 30 seconds
        // Each interval should be 6 seconds long

        let result = calculate_intervals(
            create_datetime(2021, 1, 1, 23, 59, 50).unwrap(),
            create_datetime(2021, 1, 2, 00, 00, 20).unwrap(),
            5,
        );

        assert_eq!(
            result,
            vec![
                Interval {
                    from_datetime: create_datetime(2021, 1, 1, 23, 59, 50).unwrap(),
                    to_datetime: create_datetime(2021, 1, 1, 23, 59, 56).unwrap(),
                    interval_id: result[0].interval_id.clone()
                },
                Interval {
                    from_datetime: create_datetime(2021, 1, 1, 23, 59, 56).unwrap(),
                    to_datetime: create_datetime(2021, 1, 2, 00, 00, 2).unwrap(),
                    interval_id: result[1].interval_id.clone()
                },
                Interval {
                    from_datetime: create_datetime(2021, 1, 2, 00, 00, 2).unwrap(),
                    to_datetime: create_datetime(2021, 1, 2, 00, 00, 8).unwrap(),
                    interval_id: result[2].interval_id.clone()
                },
                Interval {
                    from_datetime: create_datetime(2021, 1, 2, 00, 00, 8).unwrap(),
                    to_datetime: create_datetime(2021, 1, 2, 00, 00, 14).unwrap(),
                    interval_id: result[3].interval_id.clone()
                },
                Interval {
                    from_datetime: create_datetime(2021, 1, 2, 00, 00, 14).unwrap(),
                    to_datetime: create_datetime(2021, 1, 2, 00, 00, 20).unwrap(),
                    interval_id: result[4].interval_id.clone()
                }
            ]
        );

        // Test 2: 30 Intervals in 30 seconds
        // Each interval should be 1 second long
        let from_datetime = create_datetime(2021, 1, 1, 23, 59, 50).unwrap();
        let to_datetime = create_datetime(2021, 1, 2, 00, 00, 20).unwrap();
        let intervals = calculate_intervals(from_datetime, to_datetime, 30);

        assert_eq!(intervals.len(), 30);
        for i in 0..30 {
            assert_eq!(
                intervals[i],
                Interval {
                    from_datetime: from_datetime
                        .checked_add_signed(Duration::seconds(i as i64))
                        .unwrap(),
                    to_datetime: from_datetime
                        .checked_add_signed(Duration::seconds(i as i64 + 1))
                        .unwrap(),
                    interval_id: intervals[i].interval_id.clone()
                }
            );
        }
    }

    #[actix_rt::test]
    async fn test_temperature_chart_errors() {
        let ServiceTestContext {
            service_provider, ..
        } = setup_all_and_service_provider(
            "test_temperature_chart_errors",
            MockDataInserts::none(),
        )
        .await;

        let ctx = service_provider.basic_context().unwrap();
        let base = TemperatureChartInput {
            from_datetime: create_datetime(2021, 1, 1, 23, 59, 50).unwrap(),
            to_datetime: create_datetime(2021, 1, 1, 23, 59, 51).unwrap(),
            number_of_data_points: 5,
            filter: None,
        };

        assert_eq!(
            service_provider
                .temperature_chart_service
                .get_temperature_chart(
                    &ctx,
                    TemperatureChartInput {
                        number_of_data_points: 2,
                        ..base.clone()
                    }
                ),
            Err(TemperatureChartError::AtLeastThreeDataPoints)
        );

        assert_eq!(
            service_provider
                .temperature_chart_service
                .get_temperature_chart(
                    &ctx,
                    TemperatureChartInput {
                        number_of_data_points: 101,
                        ..base.clone()
                    }
                ),
            Err(TemperatureChartError::TooManyDataPoints)
        );

        assert_eq!(
            service_provider
                .temperature_chart_service
                .get_temperature_chart(
                    &ctx,
                    TemperatureChartInput {
                        to_datetime: create_datetime(2021, 1, 1, 23, 59, 20).unwrap(),
                        ..base.clone()
                    }
                ),
            Err(TemperatureChartError::ToDateTimeMustBeAfterFromDatetime)
        );
    }
}
