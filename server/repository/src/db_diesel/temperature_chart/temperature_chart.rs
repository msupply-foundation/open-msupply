use crate::{
    db_diesel::temperature_log_row::temperature_log::dsl as temperature_log_dsl, DBType,
    RepositoryError, StorageConnection, TemperatureLogFilter, TemperatureLogRepository,
};
use chrono::NaiveDateTime;
use diesel::prelude::*;
use util::datetime_with_offset;

use super::temperature_chart_row::{Interval, *};

pub struct TemperatureChartRepository<'a> {
    connection: &'a StorageConnection,
}

type QueryResult = (NaiveDateTime, NaiveDateTime, f64, String);

impl<'a> TemperatureChartRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        TemperatureChartRepository { connection }
    }

    pub fn query(
        &self,
        from_datetime: NaiveDateTime,
        to_datetime: NaiveDateTime,
        number_of_data_points: i32,
        temperature_log_filter: Option<TemperatureLogFilter>,
    ) -> Result<(Vec<TemperatureChartRow>, Vec<Interval>), RepositoryError> {
        let intervals = calculate_intervals(from_datetime, to_datetime, number_of_data_points);
        let mut query = TemperatureChart {
            intervals: intervals.clone(),
        }
        .into_boxed::<DBType>();

        if temperature_log_filter.is_some() {
            let temperature_log_ids =
                TemperatureLogRepository::create_filtered_query(temperature_log_filter)
                    .select(temperature_log_dsl::id);
            query = query.filter(TemperatureLogId.eq_any(temperature_log_ids));
        };

        let query = query
            .select((FromDatetime, ToDatetime, AverageTemperature, SensorId))
            .group_by((FromDatetime, ToDatetime, SensorId));

        // First by sensor then by datetime (so should be sorted by sensor and then by datetime)
        let query = query.order_by((SensorId.asc(), FromDatetime.asc()));

        // Debug diesel query
        // println!("{}", diesel::debug_query::<DBType, _>(&query).to_string());

        let chart_data = query
            .load::<QueryResult>(&self.connection.connection)?
            .into_iter()
            .map(TemperatureChartRow::from)
            .collect();

        Ok((chart_data, intervals))
    }
}

impl From<QueryResult> for TemperatureChartRow {
    fn from((from_datetime, to_datetime, average_temperature, sensor_id): QueryResult) -> Self {
        Self {
            from_datetime,
            to_datetime,
            average_temperature,
            sensor_id,
        }
    }
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
        })
        .collect()
}

#[cfg(test)]
mod test {
    use super::*;
    use crate::{
        location::LocationFilter,
        mock::{MockData, MockDataInserts},
        test_db::setup_all_with_data,
        EqualFilter, LocationRow, NameRow, SensorFilter, SensorRow, StoreRow,
        TemperatureChartRepository, TemperatureChartRow, TemperatureLogRow,
    };
    use chrono::Duration;
    use util::create_datetime;
    #[test]
    fn test_calculate_intervals() {
        // Test 1: 5 Intervals in 30 seconds
        // Each interval should be 6 seconds long

        assert_eq!(
            calculate_intervals(
                create_datetime(2021, 01, 01, 23, 59, 50).unwrap(),
                create_datetime(2021, 01, 02, 00, 00, 20).unwrap(),
                5
            ),
            vec![
                Interval {
                    from_datetime: create_datetime(2021, 01, 01, 23, 59, 50).unwrap(),
                    to_datetime: create_datetime(2021, 01, 01, 23, 59, 56).unwrap(),
                },
                Interval {
                    from_datetime: create_datetime(2021, 01, 01, 23, 59, 56).unwrap(),
                    to_datetime: create_datetime(2021, 01, 02, 00, 00, 02).unwrap(),
                },
                Interval {
                    from_datetime: create_datetime(2021, 01, 02, 00, 00, 02).unwrap(),
                    to_datetime: create_datetime(2021, 01, 02, 00, 00, 08).unwrap(),
                },
                Interval {
                    from_datetime: create_datetime(2021, 01, 02, 00, 00, 08).unwrap(),
                    to_datetime: create_datetime(2021, 01, 02, 00, 00, 14).unwrap(),
                },
                Interval {
                    from_datetime: create_datetime(2021, 01, 02, 00, 00, 14).unwrap(),
                    to_datetime: create_datetime(2021, 01, 02, 00, 00, 20).unwrap(),
                }
            ]
        );

        // Test 2: 30 Intervals in 30 seconds
        // Each interval should be 1 second long
        let from_datetime = create_datetime(2021, 01, 01, 23, 59, 50).unwrap();
        let to_datetime = create_datetime(2021, 01, 02, 00, 00, 20).unwrap();
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
                        .unwrap()
                }
            );
        }
    }

    #[actix_rt::test]
    async fn temperature_charts() {
        let name = NameRow {
            id: "name1".to_string(),
            ..Default::default()
        };

        let store = StoreRow {
            id: "store".to_string(),
            name_id: name.id.clone(),
            ..Default::default()
        };

        let location = LocationRow {
            id: "location".to_string(),
            store_id: store.id.clone(),
            ..Default::default()
        };

        let sensor1 = SensorRow {
            id: "sensor1".to_string(),
            serial: "sensor1".to_string(),
            store_id: store.id.clone(),
            ..Default::default()
        };

        let sensor2 = SensorRow {
            id: "sensor2".to_string(),
            serial: "sensor2".to_string(),
            store_id: store.id.clone(),
            ..Default::default()
        };

        // Test intervals will be
        let intervals = vec![
            Interval {
                // P1
                from_datetime: create_datetime(2021, 01, 01, 23, 59, 50).unwrap(),
                to_datetime: create_datetime(2021, 01, 01, 23, 59, 56).unwrap(),
            },
            Interval {
                // P2
                from_datetime: create_datetime(2021, 01, 01, 23, 59, 56).unwrap(),
                to_datetime: create_datetime(2021, 01, 02, 00, 00, 02).unwrap(),
            },
            Interval {
                // P3
                from_datetime: create_datetime(2021, 01, 02, 00, 00, 02).unwrap(),
                to_datetime: create_datetime(2021, 01, 02, 00, 00, 08).unwrap(),
            },
        ];
        let from_datetime = create_datetime(2021, 01, 01, 23, 59, 50).unwrap();
        let to_datetime = create_datetime(2021, 01, 02, 00, 00, 08).unwrap();
        let number_of_data_points = 3;

        // Want to test two sensors, with gap in data, and one location filter

        let s1 = &sensor1.id;
        let s2 = &sensor2.id;
        let no_location = None;
        let l1 = Some(&location.id);

        // Sensor 1 (S1)
        let temperature_logs: Vec<TemperatureLogRow> = vec![
            ((2021, 01, 01), (23, 59, 49), 100.0, s1, no_location), // Not in period
            ((2021, 01, 01), (23, 59, 50), 10.0, s1, no_location),  // (P1-S1 no location)
            ((2021, 01, 01), (23, 59, 55), 5.0, s1, no_location),   // (P1-S1 no location)
            ((2021, 01, 01), (23, 59, 56), 1.0, s1, l1),            // (P2-S1-L1)
            ((2021, 01, 02), (00, 00, 03), 0.0, s1, None),          // (P3-S1-L1)
            ((2021, 01, 02), (00, 00, 07), 5.0, s1, no_location),   // (P3-S1 no location)
            ((2021, 01, 02), (00, 00, 08), 100.0, s1, no_location), // Not in range
            ((2021, 01, 01), (23, 59, 49), 100.0, s2, no_location), // Not in period
            ((2021, 01, 01), (23, 59, 50), -10.0, s2, l1),          // (P1-S2-L1)
            ((2021, 01, 01), (23, 59, 55), -5.0, s2, l1),           // (P1-S2-L1)
            // (P2-S2) - No data
            ((2021, 01, 02), (00, 00, 03), 3.0, s2, no_location), // (P3-S2 no location)
            ((2021, 01, 02), (00, 00, 08), 100.0, s2, no_location), // Not in range
        ]
        .into_iter()
        .map(
            |(date, time, temperature, sensor_id, location)| TemperatureLogRow {
                id: util::uuid::uuid(),
                temperature,
                sensor_id: sensor_id.clone(),
                store_id: store.id.clone(),
                datetime: create_datetime(date.0, date.1, date.2, time.0, time.1, time.2).unwrap(),
                location_id: location.map(ToString::to_string),
                ..Default::default()
            },
        )
        .collect();

        let (_, connection, _, _) = setup_all_with_data(
            "temperature_charts",
            MockDataInserts::none(),
            MockData {
                stores: vec![store],
                names: vec![name],
                sensors: vec![sensor1.clone(), sensor2.clone()],
                temperature_logs: temperature_logs,
                locations: vec![location.clone()],
                ..Default::default()
            },
        )
        .await;

        let repo = TemperatureChartRepository::new(&connection);

        // Just date filter
        let result = repo
            .query(from_datetime, to_datetime, number_of_data_points, None)
            .unwrap();

        assert_eq!(
            result,
            (
                vec![
                    TemperatureChartRow {
                        from_datetime: intervals[0].from_datetime,
                        to_datetime: intervals[0].to_datetime,
                        average_temperature: 7.5,
                        sensor_id: sensor1.id.clone()
                    },
                    TemperatureChartRow {
                        from_datetime: intervals[1].from_datetime,
                        to_datetime: intervals[1].to_datetime,
                        average_temperature: 1.0,
                        sensor_id: sensor1.id.clone()
                    },
                    TemperatureChartRow {
                        from_datetime: intervals[2].from_datetime,
                        to_datetime: intervals[2].to_datetime,
                        average_temperature: 2.5,
                        sensor_id: sensor1.id.clone()
                    },
                    TemperatureChartRow {
                        from_datetime: intervals[0].from_datetime,
                        to_datetime: intervals[0].to_datetime,
                        average_temperature: -7.5,
                        sensor_id: sensor2.id.clone()
                    },
                    // Data point missing
                    TemperatureChartRow {
                        from_datetime: intervals[2].from_datetime,
                        to_datetime: intervals[2].to_datetime,
                        average_temperature: 3.0,
                        sensor_id: sensor2.id.clone()
                    }
                ],
                intervals.clone()
            )
        );

        // Filter by sensor 2
        let result = repo
            .query(
                from_datetime,
                to_datetime,
                number_of_data_points,
                Some(
                    TemperatureLogFilter::new()
                        .sensor(SensorFilter::new().id(EqualFilter::equal_to(&sensor2.id))),
                ),
            )
            .unwrap();

        assert_eq!(
            result,
            (
                vec![
                    TemperatureChartRow {
                        from_datetime: intervals[0].from_datetime,
                        to_datetime: intervals[0].to_datetime,
                        average_temperature: -7.5,
                        sensor_id: sensor2.id.clone()
                    },
                    // Data point missing
                    TemperatureChartRow {
                        from_datetime: intervals[2].from_datetime,
                        to_datetime: intervals[2].to_datetime,
                        average_temperature: 3.0,
                        sensor_id: sensor2.id.clone()
                    }
                ],
                intervals.clone()
            )
        );

        // Filter by location
        let result = repo
            .query(
                from_datetime,
                to_datetime,
                number_of_data_points,
                Some(
                    TemperatureLogFilter::new()
                        .location(LocationFilter::new().id(EqualFilter::equal_to(&location.id))),
                ),
            )
            .unwrap();

        assert_eq!(
            result,
            (
                vec![
                    TemperatureChartRow {
                        from_datetime: intervals[1].from_datetime,
                        to_datetime: intervals[1].to_datetime,
                        average_temperature: 1.0,
                        sensor_id: sensor1.id.clone()
                    },
                    TemperatureChartRow {
                        from_datetime: intervals[0].from_datetime,
                        to_datetime: intervals[0].to_datetime,
                        average_temperature: -7.5,
                        sensor_id: sensor2.id.clone()
                    },
                    // Missing data for location
                ],
                intervals
            )
        )
    }
}
