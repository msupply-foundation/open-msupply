use crate::TemperatureLogFilter;
use crate::{
    db_diesel::{
        temperature_breach_config_row::temperature_breach_config::dsl as temperature_breach_config_dsl,
        temperature_log_row::temperature_log::dsl as temperature_log_dsl,
    },
    diesel_macros::{apply_date_time_filter, apply_equal_filter},
    TemperatureBreachRowType,
};
use crate::{RepositoryError, StorageConnection};
use chrono::{NaiveDateTime, Utc};

use diesel::{prelude::*, sql_types::Integer};

use super::temperature_excursion_row::TemperatureExcursionRow;

pub struct TemperatureExcursionRepository<'a> {
    connection: &'a StorageConnection,
}

type QueryResult = (
    NaiveDateTime,
    f64,
    String,
    String,
    Option<String>,
    i32,
    bool,
);

#[derive(Debug, PartialEq, Clone)]
pub struct TemperatureRow {
    pub datetime: NaiveDateTime,
    pub temperature: f64,
    pub store_id: String,
    pub sensor_id: String,
    pub location_id: Option<String>,
    pub is_excursion: bool,
    pub duration: i64,
}

impl<'a> TemperatureExcursionRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        TemperatureExcursionRepository { connection }
    }

    /// Result is sorted by datetime descending
    pub fn query(
        &self,
        filter: TemperatureLogFilter,
    ) -> Result<Vec<TemperatureExcursionRow>, RepositoryError> {
        let mut query = temperature_log_dsl::temperature_log
            .inner_join(
                temperature_breach_config_dsl::temperature_breach_config
                    .on(temperature_log_dsl::store_id.eq(temperature_breach_config_dsl::store_id)),
            )
            .select((
                temperature_log_dsl::datetime,
                temperature_log_dsl::temperature,
                temperature_log_dsl::store_id,
                temperature_log_dsl::sensor_id,
                temperature_log_dsl::location_id,
                (temperature_breach_config_dsl::duration_milliseconds / 1000).into_sql::<Integer>(),
                temperature_log_dsl::temperature.not_between(
                    temperature_breach_config_dsl::minimum_temperature,
                    temperature_breach_config_dsl::maximum_temperature,
                ),
            ))
            .filter(temperature_log_dsl::temperature_breach_id.is_null())
            .order(temperature_log_dsl::datetime.asc())
            .into_boxed();

        apply_equal_filter!(query, filter.store_id, temperature_log_dsl::store_id);
        apply_date_time_filter!(query, filter.datetime, temperature_log_dsl::datetime);

        query = query.filter(temperature_breach_config_dsl::is_active.eq(true));

        apply_equal_filter!(
            query,
            Some(TemperatureBreachRowType::Excursion.equal_to()),
            temperature_breach_config_dsl::type_
        );

        // Debug diesel query
        // println!("{}", diesel::debug_query::<DBType, _>(&query).to_string());

        let mut excursion_data: Vec<TemperatureExcursionRow> = Vec::new();
        let log_data = query
            .load::<QueryResult>(&self.connection.connection)?
            .into_iter()
            .map(TemperatureRow::from)
            .collect::<Vec<TemperatureRow>>();

        for row in log_data.iter() {
            if row.is_excursion == true {
                println!("{:?}", row);

                let excursion_end = log_data.iter().find(|r| {
                    r.datetime > row.datetime
                        && r.sensor_id == row.sensor_id
                        && r.is_excursion == false
                        && r.store_id == row.store_id
                        && r.location_id == row.location_id
                });

                if excursion_end.is_some() {
                    continue;
                }

                let existing_excursion = excursion_data.iter().find(|r| {
                    r.sensor_id == row.sensor_id
                        && r.store_id == row.store_id
                        && r.location_id == row.location_id
                });

                if existing_excursion.is_some() {
                    continue;
                }

                let duration = Utc::now().timestamp() - row.datetime.timestamp();
                if duration > row.duration {
                    excursion_data.push(TemperatureExcursionRow {
                        datetime: row.datetime,
                        temperature: row.temperature,
                        location_id: row.location_id.clone(),
                        duration,
                        sensor_id: row.sensor_id.clone(),
                        store_id: row.store_id.clone(),
                    })
                }
            };
            println!("{:?}", row);
        }

        Ok(excursion_data)
    }
}

impl TemperatureRow {
    fn from(
        (datetime, temperature, store_id, sensor_id, location_id, duration, is_excursion): QueryResult,
    ) -> Self {
        Self {
            datetime,
            temperature,
            sensor_id,
            location_id,
            duration: duration as i64,
            store_id,
            is_excursion,
        }
    }
}
#[cfg(test)]
mod test {
    use crate::{
        db_diesel::temperature_excursion_row::TemperatureExcursionRow,
        mock::{MockData, MockDataInserts},
        test_db::setup_all_with_data,
        DatetimeFilter, LocationRow, NameRow, SensorRow, StoreRow, TemperatureBreachConfigRow,
        TemperatureBreachRowType, TemperatureExcursionRepository, TemperatureLogFilter,
        TemperatureLogRow,
    };

    use chrono::{Days, NaiveTime, Utc};
    use rand::{seq::SliceRandom, thread_rng};

    #[actix_rt::test]
    async fn temperature_excursions() {
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

        let temperature_breach_config = TemperatureBreachConfigRow {
            id: "config".to_string(),
            description: "config1".to_string(),
            minimum_temperature: 0.0,
            maximum_temperature: 25.0,
            store_id: store.id.clone(),
            is_active: true,
            duration_milliseconds: 24 * 60 * 60 * 1000, // one day
            r#type: TemperatureBreachRowType::Excursion,
        };

        // testing with two sensors
        let s1 = &sensor1.id;
        let s2 = &sensor2.id;

        let l1 = Some(&location.id);
        let today = Utc::now().naive_utc();
        let start_date_time = today.checked_sub_days(Days::new(30)).unwrap();

        // Sensor 1 (S1)
        let mut temperature_logs: Vec<TemperatureLogRow> = vec![
            (40, (23, 59, 49), 30.0, s1, None), // Not in period
            (10, (10, 59, 50), 26.0, s1, None), // (S1 no location, over temp)
            (10, (11, 59, 55), 5.0, s1, None),  // (S1 no location, returned to within range)
            (9, (23, 59, 56), 20.0, s1, l1),    // (S1-L1)
            (1, (23, 56, 03), 40.0, s1, l1),    // (S1-L1, too short)
            (8, (02, 00, 07), 30.0, s1, None),  // (S1 no location)
            (8, (03, 00, 08), 31.5, s1, None),  // (S1 no location, excursion, too hot)
            (7, (12, 00, 00), -20.0, s2, None), // (S1-L1)
            (7, (12, 06, 00), -30.0, s2, None), // (S1-L1, too cold)
        ]
        .into_iter()
        .map(
            |(days_ago, time, temperature, sensor_id, location)| TemperatureLogRow {
                id: util::uuid::uuid(),
                temperature,
                sensor_id: sensor_id.clone(),
                store_id: store.id.clone(),
                datetime: today
                    .checked_sub_days(Days::new(days_ago))
                    .unwrap()
                    .date()
                    .and_time(NaiveTime::from_hms_opt(time.0, time.1, time.2).unwrap()),
                location_id: location.map(ToString::to_string),
                ..Default::default()
            },
        )
        .collect();

        // This repository should return results ordered by datetime descending
        // shuffling in order to test this
        temperature_logs.shuffle(&mut thread_rng());

        let (_, connection, _, _) = setup_all_with_data(
            "temperature_excursions",
            MockDataInserts::none(),
            MockData {
                stores: vec![store],
                names: vec![name],
                sensors: vec![sensor1.clone(), sensor2.clone()],
                temperature_logs,
                locations: vec![location.clone()],
                temperature_breach_configs: vec![temperature_breach_config],
                ..Default::default()
            },
        )
        .await;

        let repo = TemperatureExcursionRepository::new(&connection);

        let result = repo
            .query(
                TemperatureLogFilter::new()
                    .datetime(DatetimeFilter::after_or_equal_to(start_date_time)),
            )
            .unwrap();

        let datetime1 = today
            .checked_sub_days(Days::new(8))
            .unwrap()
            .date()
            .and_time(NaiveTime::from_hms_opt(02, 00, 07).unwrap());
        let duration1 = today.timestamp() - datetime1.timestamp();
        let datetime2 = today
            .checked_sub_days(Days::new(7))
            .unwrap()
            .date()
            .and_time(NaiveTime::from_hms_opt(12, 00, 00).unwrap());
        let duration2 = today.timestamp() - datetime2.timestamp();

        assert_eq!(
            result,
            vec![
                TemperatureExcursionRow {
                    datetime: datetime1,
                    temperature: 30.0,
                    location_id: None,
                    duration: duration1,
                    store_id: "store".to_string(),
                    sensor_id: sensor1.id.clone(),
                },
                TemperatureExcursionRow {
                    datetime: datetime2,
                    temperature: -20.0,
                    location_id: None,
                    duration: duration2,
                    store_id: "store".to_string(),
                    sensor_id: sensor2.id.clone(),
                },
            ],
        );
    }
}
