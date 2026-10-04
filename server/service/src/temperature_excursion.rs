use chrono::{Days, Utc};
use repository::{
    DatetimeFilter, EqualFilter, RepositoryError, SensorFilter, StorageConnection,
    TemperatureExcursion, TemperatureExcursionRepository, TemperatureLogFilter, TemperatureRow,
};

pub struct TemperatureExcursionService {}
impl TemperatureExcursionServiceTrait for TemperatureExcursionService {}

pub trait TemperatureExcursionServiceTrait: Sync + Send {
    fn excursions(
        &self,
        connection: &StorageConnection,
        store_id: &str,
    ) -> Result<Vec<TemperatureExcursion>, RepositoryError> {
        let filter = TemperatureLogFilter::new()
            .store_id(EqualFilter::equal_to(store_id.to_string()))
            .datetime(DatetimeFilter::after_or_equal_to(
                Utc::now()
                    .naive_utc()
                    .checked_sub_days(Days::new(7))
                    .unwrap(),
            ))
            .sensor(SensorFilter::new().is_active(true));

        let log_data = TemperatureExcursionRepository::new(connection).query(filter)?;

        temperature_excursions(log_data)
    }
}

fn temperature_excursions(
    log_data: Vec<TemperatureRow>,
) -> Result<Vec<TemperatureExcursion>, RepositoryError> {
    let mut excursion_data: Vec<TemperatureExcursion> = Vec::new();

    for row in log_data.iter() {
        if row.is_excursion {
            let excursion_end = log_data.iter().find(|r| {
                r.datetime > row.datetime
                    && r.sensor_id == row.sensor_id
                    && !r.is_excursion
                    && r.store_id == row.store_id
                    && r.location_id == row.location_id
            });

            // if the temperature is back within range then we don't
            // to need notify of the excursion
            if excursion_end.is_some() {
                continue;
            }

            let existing_excursion = excursion_data.iter().find(|r| {
                r.sensor_id == row.sensor_id
                    && r.store_id == row.store_id
                    && r.location_id == row.location_id
            });

            // we may have multiple temperature log records for a given sensor
            // in which case there is only one excursion to report
            if existing_excursion.is_some() {
                continue;
            }

            let duration = Utc::now().timestamp() - row.datetime.and_utc().timestamp();
            if duration > row.duration {
                excursion_data.push(TemperatureExcursion {
                    id: row.id.clone(),
                    datetime: row.datetime,
                    temperature: row.temperature,
                    location_id: row.location_id.clone(),
                    duration,
                    sensor_id: row.sensor_id.clone(),
                    store_id: row.store_id.clone(),
                })
            }
        };
    }

    Ok(excursion_data.into_iter().collect())
}

#[cfg(test)]
mod test {
    use repository::{
        mock::{MockData, MockDataInserts},
        test_db::setup_all_with_data,
        DatetimeFilter, LocationRow, NameRow, SensorRow, StoreRow, TemperatureBreachConfigRow,
        TemperatureBreachType, TemperatureExcursion, TemperatureExcursionRepository,
        TemperatureLogFilter, TemperatureLogRow,
    };

    use chrono::{Duration, Timelike, Utc};
    use rand::seq::SliceRandom;

    use crate::temperature_excursion::temperature_excursions;

    #[actix_rt::test]
    async fn temperature_excursion_tests() {
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
            r#type: TemperatureBreachType::Excursion,
        };

        // testing with two sensors
        let s1 = &sensor1.id;
        let s2 = &sensor2.id;

        let l1 = Some(&location.id);
        // Whole seconds so the datetimes round-trip through the database unchanged
        let now = Utc::now().naive_utc().with_nanosecond(0).unwrap();
        let start_date_time = now - Duration::days(30);

        // Log times are offsets (in minutes) before `now`, rather than fixed
        // clock times on a past calendar day, so the durations do not depend
        // on the time of day the test runs.
        let day = 24 * 60;
        // Sensor 1 (S1)
        let mut temperature_logs: Vec<TemperatureLogRow> = vec![
            ("log_1".to_string(), 40 * day, 30.0, s1, None), // Not in period
            ("log_2".to_string(), 10 * day + 120, 26.0, s1, None), // (S1 no location, over temp)
            ("log_3".to_string(), 10 * day + 60, 5.0, s1, None), // (S1 no location, returned to within range)
            ("log_4".to_string(), 9 * day, 20.0, s1, l1),        // (S1-L1)
            ("log_5".to_string(), 12 * 60, 40.0, s1, l1), // (S1-L1, too short: under one day)
            ("log_6".to_string(), 8 * day + 120, 30.0, s1, None), // (S1 no location)
            ("log_7".to_string(), 8 * day + 60, 31.5, s1, None), // (S1 no location, excursion, too hot)
            ("log_8".to_string(), 7 * day + 12, -20.0, s2, None), // (S2-L1)
            ("log_9".to_string(), 7 * day + 6, -30.0, s2, None), // (S2-L1, too cold)
        ]
        .into_iter()
        .map(
            |(id, minutes_ago, temperature, sensor_id, location)| TemperatureLogRow {
                id,
                temperature,
                sensor_id: sensor_id.clone(),
                store_id: store.id.clone(),
                datetime: now - Duration::minutes(minutes_ago),
                location_id: location.map(ToString::to_string),
                ..Default::default()
            },
        )
        .collect();

        // This repository should return results ordered by datetime descending
        // shuffling in order to test this
        temperature_logs.shuffle(&mut rand::rng());

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

        let log_data = repo
            .query(
                TemperatureLogFilter::new()
                    .datetime(DatetimeFilter::after_or_equal_to(start_date_time)),
            )
            .unwrap();
        let result = temperature_excursions(log_data).unwrap();

        let expected = vec![
            TemperatureExcursion {
                id: "log_6".to_string(),
                datetime: now - Duration::minutes(8 * day + 120),
                temperature: 30.0,
                location_id: None,
                duration: 0,
                store_id: "store".to_string(),
                sensor_id: sensor1.id.clone(),
            },
            TemperatureExcursion {
                id: "log_8".to_string(),
                datetime: now - Duration::minutes(7 * day + 12),
                temperature: -20.0,
                location_id: None,
                duration: 0,
                store_id: "store".to_string(),
                sensor_id: sensor2.id.clone(),
            },
        ];

        // Duration is measured from the moment `excursions` ran, which may be a
        // second or two after `now`, so check it separately with a tolerance
        for (actual, expected) in result.iter().zip(expected.iter()) {
            let expected_duration = (now - expected.datetime).num_seconds();
            assert!(
                (actual.duration - expected_duration).abs() <= 5,
                "{}: duration {} not within 5s of {}",
                actual.id,
                actual.duration,
                expected_duration
            );
        }

        let without_duration = |e: &TemperatureExcursion| TemperatureExcursion {
            duration: 0,
            ..e.clone()
        };
        assert_eq!(
            result.iter().map(without_duration).collect::<Vec<_>>(),
            expected
        );
    }
}
