use crate::temperature_excursion_row::*;
use crate::{
    DBType, RepositoryError, StorageConnection, TemperatureExcursion, TemperatureExcursionRow,
};
use chrono::NaiveDateTime;
use diesel::prelude::*;

pub struct TemperatureExcursionRepository<'a> {
    connection: &'a StorageConnection,
}

type QueryResult = (NaiveDateTime, f64, String, String, f64);

impl<'a> TemperatureExcursionRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        TemperatureExcursionRepository { connection }
    }

    /// Result is sorted by datetime descending
    pub fn query(
        &self,
        start_datetime: NaiveDateTime,
    ) -> Result<Vec<TemperatureExcursionRow>, RepositoryError> {
        let query = TemperatureExcursion { start_datetime }
            .into_boxed::<DBType>()
            .select((Datetime, AverageTemperature, SensorId, LocationId, Duration))
            .order_by(Datetime.desc());

        // Debug diesel query
        println!("{}", diesel::debug_query::<DBType, _>(&query).to_string());

        let excursion_data = query
            .load::<QueryResult>(&self.connection.connection)?
            .into_iter()
            .map(TemperatureExcursionRow::from)
            .collect::<Result<_, _>>()?;

        Ok(excursion_data)
    }
}

impl TemperatureExcursionRow {
    fn from(
        (datetime, average_temperature, sensor_id, location_id, duration): QueryResult,
    ) -> Result<Self, RepositoryError> {
        Ok(Self {
            datetime,
            average_temperature,
            sensor_id,
            location_id: Some(location_id),
            duration,
        })
    }
}
// let current_datetime = Utc::now().naive_utc();
//current_datetime.checked_sub_months(Months::new(1)).unwrap()

#[cfg(test)]
mod test {
    use crate::{
        mock::{MockData, MockDataInserts},
        test_db::setup_all_with_data,
        LocationRow, NameRow, SensorRow, StoreRow, TemperatureBreachConfigRow,
        TemperatureBreachRowType, TemperatureExcursionRepository, TemperatureExcursionRow,
        TemperatureLogRow,
    };

    use chrono::{Days, NaiveDate, NaiveTime};
    use rand::{seq::SliceRandom, thread_rng};
    use util::create_datetime;

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
            duration_milliseconds: 300000, // five minutes
            r#type: TemperatureBreachRowType::Excursion,
        };

        // testing with two sensors
        let s1 = &sensor1.id;
        let s2 = &sensor2.id;

        let l1 = Some(&location.id);
        let today = NaiveDate::from_ymd_opt(2023, 12, 5).unwrap();
        let start_date_time = create_datetime(2023, 11, 5, 0, 0, 0).unwrap();

        // Sensor 1 (S1)
        let mut temperature_logs: Vec<TemperatureLogRow> = vec![
            (40, (23, 59, 49), 30.0, s1, None), // Not in period
            (10, (10, 59, 50), 26.0, s1, None), // (S1 no location, over temp)
            (10, (11, 59, 55), 5.0, s1, None),  // (S1 no location, returned to within range)
            (9, (23, 59, 56), 30.0, s1, l1),    // (S1-L1)
            (9, (00, 00, 03), 40.0, s1, l1),    // (S1-L1, too short)
            (8, (02, 00, 07), 30.0, s1, None),  // (S1 no location)
            (8, (03, 00, 08), 30.0, s1, None),  // (S1 no location, excursion, too hot)
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

        let result = repo.query(start_date_time).unwrap();
        assert_eq!(
            result,
            vec![TemperatureExcursionRow {
                datetime: start_date_time.checked_add_days(Days::new(22)).unwrap(),
                average_temperature: 30.0,
                location_id: None,
                duration: 8.0 * 24.0 * 60.0 * 60.0,
                // (8, (03, 00, 08), 30.0, s1, None),  // (S1 no location, excursion, too hot)
                // (7, (12, 00, 00), -20.0, s2, None), // (S1-L1)
                // (7, (12, 06, 00), -30.0, s2, None), // (S1-L1, too cold)
                // interval_id: intervals[0].interval_id.clone(),
                // average_temperature: 7.5,
                sensor_id: sensor1.id.clone(),
            },],
        );

        // Filter by sensor 2
        // let result = repo.query().unwrap();

        // assert_eq!(
        //     result,
        //     vec![
        //         TemperatureExcursionRow {
        //             interval_id: intervals[0].interval_id.clone(),
        //             average_temperature: -7.5,
        //             sensor_id: sensor2.id.clone(),
        //             breach_ids: Vec::new()
        //         },
        //         // Data point missing
        //         TemperatureExcursionRow {
        //             interval_id: intervals[2].interval_id.clone(),
        //             average_temperature: 3.0,
        //             sensor_id: sensor2.id.clone(),
        //             breach_ids: Vec::new()
        //         }
        //     ]
        // );

        // Filter by location
        // let result = repo.query().unwrap();

        // assert_eq!(
        //     result,
        //     vec![
        //         TemperatureExcursionRow {
        //             interval_id: intervals[1].interval_id.clone(),
        //             average_temperature: 1.0,
        //             sensor_id: sensor1.id.clone(),
        //             breach_ids: Vec::new()
        //         },
        //         TemperatureExcursionRow {
        //             interval_id: intervals[0].interval_id.clone(),
        //             average_temperature: -7.5,
        //             sensor_id: sensor2.id.clone(),
        //             breach_ids: Vec::new()
        //         }
        //     ] // Missing data for location
        // );
    }
}
