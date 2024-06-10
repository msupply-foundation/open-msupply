use super::update::update_sensor_logs_for_breach;
use anyhow::Context;
use chrono::{Local, LocalResult, NaiveDateTime, TimeZone};
use repository::{DatetimeFilter, EqualFilter};
use repository::{
    RepositoryError, Sensor, SensorFilter, SensorRepository, SensorRow, SensorRowRepository,
    SensorType, StorageConnection, TemperatureBreach, TemperatureBreachConfig,
    TemperatureBreachConfigFilter, TemperatureBreachConfigRepository, TemperatureBreachConfigRow,
    TemperatureBreachConfigRowRepository, TemperatureBreachFilter, TemperatureBreachRepository,
    TemperatureBreachRow, TemperatureBreachRowRepository, TemperatureBreachType, TemperatureLog,
    TemperatureLogFilter, TemperatureLogRepository, TemperatureLogRow, TemperatureLogRowRepository,
};
use serde::Serialize;
use std::path::PathBuf;
use thiserror::Error;
use util::uuid::uuid;

use temperature_sensor::*;

pub fn get_breach_row_type(breach_type: &BreachType) -> TemperatureBreachType {
    match breach_type {
        BreachType::ColdConsecutive => TemperatureBreachType::ColdConsecutive,
        BreachType::ColdCumulative => TemperatureBreachType::ColdCumulative,
        BreachType::HotConsecutive => TemperatureBreachType::HotConsecutive,
        BreachType::HotCumulative => TemperatureBreachType::HotCumulative,
    }
}

fn get_matching_sensor_serial(
    connection: &StorageConnection,
    serial: &str,
) -> Result<Vec<Sensor>, RepositoryError> {
    SensorRepository::new(connection)
        .query_by_filter(SensorFilter::new().serial(EqualFilter::equal_to(&serial)))
}

fn get_matching_sensor_log(
    connection: &StorageConnection,
    sensor_id: &str,
    datetime: NaiveDateTime,
) -> Result<Vec<TemperatureLog>, RepositoryError> {
    let filter = TemperatureLogFilter::new()
        .sensor(SensorFilter::new().id(EqualFilter::equal_to(sensor_id)))
        .datetime(DatetimeFilter::equal_to(datetime));

    TemperatureLogRepository::new(connection).query_by_filter(filter)
}

fn get_matching_sensor_breach_config(
    connection: &StorageConnection,
    store_id: &str,
    temperature_breach_config: &temperature_sensor::TemperatureBreachConfig,
    breach_type: &TemperatureBreachType,
) -> Result<Vec<TemperatureBreachConfig>, RepositoryError> {
    let filter = TemperatureBreachConfigFilter::new()
        .store_id(EqualFilter::equal_to(store_id))
        .duration_milliseconds(EqualFilter::equal_to_i32(
            temperature_breach_config.duration.num_milliseconds() as i32,
        ))
        .minimum_temperature(EqualFilter::equal_to_f64(
            temperature_breach_config.minimum_temperature,
        ))
        .maximum_temperature(EqualFilter::equal_to_f64(
            temperature_breach_config.maximum_temperature,
        ))
        .r#type(breach_type.equal_to());

    TemperatureBreachConfigRepository::new(connection).query_by_filter(filter)
}

fn get_matching_sensor_breach(
    connection: &StorageConnection,
    sensor_id: &str,
    start_datetime: NaiveDateTime,
    breach_type: &TemperatureBreachType,
) -> Result<Option<TemperatureBreach>, RepositoryError> {
    let filter = TemperatureBreachFilter::new()
        .sensor(SensorFilter::new().id(EqualFilter::equal_to(sensor_id)))
        .r#type(breach_type.equal_to())
        .start_datetime(DatetimeFilter::equal_to(start_datetime));

    Ok(TemperatureBreachRepository::new(connection)
        .query_by_filter(filter)?
        .pop())
}

fn sensor_add_log_if_new(
    connection: &StorageConnection,
    sensor_row: &SensorRow,
    temperature_log: &temperature_sensor::TemperatureLog,
) -> Result<(), RepositoryError> {
    let result = get_matching_sensor_log(connection, &sensor_row.id, temperature_log.timestamp)?;

    if let Some(_record) = result.clone().pop() {
        Ok(())
    } else {
        let new_temperature_log = TemperatureLogRow {
            id: uuid(),
            store_id: sensor_row.store_id.clone(),
            sensor_id: sensor_row.id.clone(),
            location_id: sensor_row.location_id.clone(),
            temperature: temperature_log.temperature,
            datetime: temperature_log.timestamp,
            temperature_breach_id: None,
        };
        TemperatureLogRowRepository::new(connection).upsert_one(&new_temperature_log)?;
        log::info!("Added sensor log {:?} ", new_temperature_log);
        Ok(())
    }
}

fn sensor_add_breach_if_new(
    connection: &StorageConnection,
    sensor_row: &SensorRow,
    temperature_breach: &temperature_sensor::TemperatureBreach,
    breach_config: &temperature_sensor::TemperatureBreachConfig,
) -> Result<Option<TemperatureBreachRow>, RepositoryError> {
    let breach_row_type = get_breach_row_type(&temperature_breach.breach_type);
    let temperature_breach_option = get_matching_sensor_breach(
        connection,
        &sensor_row.id,
        temperature_breach.start_timestamp,
        &breach_row_type,
    )?;

    let temperature_breach_upsert = match temperature_breach_option {
        Some(existing_breach) => {
            let existing_breach_row = existing_breach.temperature_breach_row;
            if existing_breach_row.end_datetime == Some(temperature_breach.end_timestamp) {
                return Ok(None);
            }
            let breach = TemperatureBreachRow {
                end_datetime: Some(temperature_breach.end_timestamp),
                duration_milliseconds: temperature_breach.duration.num_milliseconds() as i32,
                ..existing_breach_row
            };
            log::info!("Updating breach {:?} ", breach);
            breach
        }
        None => {
            let breach = TemperatureBreachRow {
                id: uuid(),
                store_id: sensor_row.store_id.clone(),
                sensor_id: sensor_row.id.clone(),
                location_id: sensor_row.location_id.clone(),
                start_datetime: temperature_breach.start_timestamp,
                end_datetime: Some(temperature_breach.end_timestamp),
                unacknowledged: true,
                duration_milliseconds: temperature_breach.duration.num_milliseconds() as i32,
                r#type: breach_row_type,
                threshold_duration_milliseconds: breach_config.duration.num_milliseconds() as i32,
                threshold_minimum: breach_config.minimum_temperature,
                threshold_maximum: breach_config.maximum_temperature,
                comment: None,
            };
            log::info!("Added breach {:?} ", breach);
            breach
        }
    };

    TemperatureBreachRowRepository::new(connection).upsert_one(&temperature_breach_upsert)?;

    Ok(Some(temperature_breach_upsert))
}

fn sensor_add_breach_config_if_new(
    connection: &StorageConnection,
    sensor_row: &SensorRow,
    temperature_breach_config: &temperature_sensor::TemperatureBreachConfig,
) -> Result<(), RepositoryError> {
    let config_description = format!(
        "for {} minutes",
        temperature_breach_config.duration.num_minutes()
    );
    let breach_row_type = get_breach_row_type(&temperature_breach_config.breach_type);

    let config_description = match temperature_breach_config.breach_type {
        BreachType::ColdConsecutive => {
            format!(
                "Consecutive {config_description} colder than {}",
                temperature_breach_config.minimum_temperature
            )
        }
        BreachType::ColdCumulative => {
            format!(
                "Cumulative {config_description} colder than {}",
                temperature_breach_config.minimum_temperature
            )
        }
        BreachType::HotConsecutive => {
            format!(
                "Consecutive {config_description} hotter than {}",
                temperature_breach_config.maximum_temperature
            )
        }
        BreachType::HotCumulative => {
            format!(
                "Cumulative {config_description} hotter than {}",
                temperature_breach_config.maximum_temperature
            )
        }
    };

    let result = get_matching_sensor_breach_config(
        connection,
        &sensor_row.store_id,
        &temperature_breach_config,
        &breach_row_type,
    )?;

    if !result.is_empty() {
        return Ok(());
    };

    let new_temperature_breach_config = TemperatureBreachConfigRow {
        id: uuid(),
        store_id: sensor_row.store_id.clone(),
        is_active: true,
        description: config_description.clone(),
        duration_milliseconds: temperature_breach_config.duration.num_milliseconds() as i32,
        r#type: breach_row_type,
        minimum_temperature: temperature_breach_config.minimum_temperature,
        maximum_temperature: temperature_breach_config.maximum_temperature,
    };

    TemperatureBreachConfigRowRepository::new(connection)
        .upsert_one(&new_temperature_breach_config)?;
    log::info!(
        "Added sensor breach config {:?} ",
        new_temperature_breach_config
    );
    Ok(())
}

fn sensor_add_if_new(
    connection: &StorageConnection,
    store_id: &str,
    temperature_sensor: &temperature_sensor::Sensor,
) -> Result<Option<String>, RepositoryError> {
    let result = get_matching_sensor_serial(connection, &temperature_sensor.serial)?;

    if !result.is_empty() {
        return Ok(None);
    };

    let mut interval_seconds = None;
    if let Some(interval_duration) = temperature_sensor.log_interval {
        interval_seconds = Some(interval_duration.num_seconds() as i32);
    }
    let new_sensor = SensorRow {
        id: uuid(),
        serial: temperature_sensor.serial.clone(),
        name: temperature_sensor.name.clone(),
        store_id: store_id.to_string(),
        location_id: None,
        last_connection_datetime: None,
        battery_level: None,
        is_active: true,
        log_interval: interval_seconds,
        r#type: SensorType::Berlinger,
    };
    SensorRowRepository::new(connection).upsert_one(&new_sensor)?;
    log::info!("Added sensor {:?} ", new_sensor);
    Ok(Some(new_sensor.id))
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReadSensor {
    new_sensor_id: Option<String>,
    number_of_logs: u32,
    number_of_breaches: u32,
}

#[derive(Debug, Error)]
pub enum ReadSensorError {
    #[error(transparent)]
    DatabaseError(#[from] RepositoryError),
    #[error("Problem reading sensor data {0}")]
    StringError(String),
    #[error(transparent)]
    Other(#[from] anyhow::Error),
}

fn convert_from_localtime(
    sensor: &temperature_sensor::Sensor,
) -> Result<temperature_sensor::Sensor, ReadSensorError> {
    // map logs
    let logs_mapped: Option<Vec<temperature_sensor::TemperatureLog>> = match sensor.clone().logs {
        None => None,
        Some(logs) => Some(
            logs.into_iter()
                .map(
                    |temperature_sensor::TemperatureLog {
                         timestamp,
                         temperature,
                     }| {
                        let local = match Local.from_local_datetime(&timestamp) {
                            LocalResult::None => {
                                return Err(anyhow::anyhow!("Cannot convert to local timestamp"))
                            }
                            LocalResult::Single(r) => r,
                            LocalResult::Ambiguous(r, _) => r,
                        };
                        Ok(temperature_sensor::TemperatureLog {
                            temperature,
                            timestamp: local.naive_utc(),
                        })
                    },
                )
                .collect::<Result<_, _>>()?,
        ),
    };
    // map temperature breaches
    let breaches_mapped: Option<Vec<temperature_sensor::TemperatureBreach>> = match sensor
        .clone()
        .breaches
    {
        None => None,
        Some(breaches) => Some(
            breaches
                .into_iter()
                .map(
                    |temperature_sensor::TemperatureBreach {
                         breach_type,
                         start_timestamp,
                         end_timestamp,
                         duration,
                         acknowledged,
                     }| {
                        let local_start = match Local.from_local_datetime(&start_timestamp) {
                            LocalResult::None => {
                                return Err(anyhow::anyhow!("Cannot convert to local timestamp"))
                            }
                            LocalResult::Single(r) => r,
                            LocalResult::Ambiguous(r, _) => r,
                        };
                        let local_end = match Local.from_local_datetime(&end_timestamp) {
                            LocalResult::None => {
                                return Err(anyhow::anyhow!("Cannot convert to local timestamp"))
                            }
                            LocalResult::Single(r) => r,
                            LocalResult::Ambiguous(r, _) => r,
                        };
                        Ok(temperature_sensor::TemperatureBreach {
                            breach_type,
                            start_timestamp: local_start.naive_utc(),
                            end_timestamp: local_end.naive_utc(),
                            duration,
                            acknowledged,
                        })
                    },
                )
                .collect::<Result<_, _>>()?,
        ),
    };
    // convert last connected timestamp
    let last_connected_timestamp_converted = match sensor.clone().last_connected_timestamp {
        None => None,
        Some(timestamp) => Some(match Local.from_local_datetime(&timestamp) {
            LocalResult::None => {
                return Err(anyhow::anyhow!("Cannot convert to local timestamp").into())
            }
            LocalResult::Single(r) => r.naive_utc(),
            LocalResult::Ambiguous(r, _) => r.naive_utc(),
        }),
    };

    let mut sensor_mapped = sensor.clone();
    sensor_mapped.last_connected_timestamp = last_connected_timestamp_converted;
    sensor_mapped.breaches = breaches_mapped;
    sensor_mapped.logs = logs_mapped;

    Ok(sensor_mapped)
}

pub fn read_sensor(
    connection: &StorageConnection,
    store_id: &str,
    fridgetag_file: PathBuf,
) -> anyhow::Result<ReadSensor, ReadSensorError> {
    let filename = fridgetag_file.to_string_lossy();

    let temperature_sensor_unmapped =
        temperature_sensor::read_sensor_file(&filename).map_err(ReadSensorError::StringError)?;
    let temperature_sensor = convert_from_localtime(&temperature_sensor_unmapped)?;

    Ok(integrate_sensor_data(
        connection,
        store_id,
        temperature_sensor,
    )?)
}

fn integrate_sensor_data(
    connection: &StorageConnection,
    store_id: &str,
    temperature_sensor: temperature_sensor::Sensor,
) -> anyhow::Result<ReadSensor, ReadSensorError> {
    let new_sensor_id = sensor_add_if_new(connection, &store_id, &temperature_sensor)?;

    let result = get_matching_sensor_serial(connection, &temperature_sensor.serial)?;

    let sensor_row = result
        .clone()
        .pop()
        .context("Sensor could not be inserted or found in database")?
        .sensor_row;

    // Filter sensor data by previous last connected time
    let last_connected = sensor_row.last_connection_datetime;
    let temperature_sensor =
        temperature_sensor::filter_sensor(temperature_sensor, last_connected, None);

    let temperature_sensor_configs = temperature_sensor.configs.unwrap_or_default();
    for temperature_sensor_config in temperature_sensor_configs.iter() {
        sensor_add_breach_config_if_new(connection, &sensor_row, &temperature_sensor_config)?;
    }

    let temperature_sensor_breaches = temperature_sensor.breaches.unwrap_or_default();
    let temperature_sensor_logs = temperature_sensor.logs.unwrap_or_default();

    let result = ReadSensor {
        new_sensor_id,
        number_of_logs: temperature_sensor_logs.len() as u32,
        number_of_breaches: temperature_sensor_breaches.len() as u32,
    };

    for temperature_sensor_log in temperature_sensor_logs {
        sensor_add_log_if_new(connection, &sensor_row, &temperature_sensor_log)?;
    }

    // Add consecutive then cumulative breaches, order is important because breach and log association
    // is priorities for consecutive breach i.e. if log is in both cumulative and consecutive breach
    // the breach id would be from consecutive
    for temperature_sensor_breach in sort_breaches_by_type(temperature_sensor_breaches) {
        // Look up matching config from the USB data and snapshot it as part of the breach
        if let Some(temperature_sensor_config) = temperature_sensor_configs
            .iter()
            .find(|&t| t.breach_type == temperature_sensor_breach.breach_type)
        {
            let upserted_breach = sensor_add_breach_if_new(
                connection,
                &sensor_row,
                &temperature_sensor_breach,
                &temperature_sensor_config,
            )?;

            if let Some(upserted_breach) = upserted_breach {
                update_sensor_logs_for_breach(connection, &upserted_breach)?;
            }
        }
    }

    // Finally, update sensor's last connected time if it has changed
    if sensor_row.last_connection_datetime != temperature_sensor.last_connected_timestamp {
        SensorRowRepository::new(connection).upsert_one(&SensorRow {
            last_connection_datetime: temperature_sensor.last_connected_timestamp,
            ..sensor_row
        })?;
    }

    Ok(result)
}

// First of all consecutive and then cumulative
fn breach_sort_weight(breach: &TemperatureBreachType) -> u8 {
    use TemperatureBreachType::*;
    match breach {
        ColdConsecutive => 1,
        HotConsecutive => 2,
        ColdCumulative => 3,
        HotCumulative => 4,
        Excursion => 5,
    }
}

fn sort_breaches_by_type(
    mut breaches: Vec<temperature_sensor::TemperatureBreach>,
) -> Vec<temperature_sensor::TemperatureBreach> {
    breaches.sort_by(|a, b| {
        breach_sort_weight(&get_breach_row_type(&a.breach_type))
            .cmp(&breach_sort_weight(&get_breach_row_type(&b.breach_type)))
    });

    breaches
}

#[cfg(test)]
mod test {

    use super::integrate_sensor_data;
    use crate::{
        sensor::berlinger::breach_sort_weight,
        test_helpers::{setup_all_and_service_provider, ServiceTestContext},
    };
    use chrono::{Duration, NaiveDate, NaiveDateTime};
    use repository::{
        mock::{mock_store_a, MockDataInserts},
        Pagination, Sort, TemperatureBreachFilter, TemperatureBreachRepository,
        TemperatureBreachRow, TemperatureBreachType, TemperatureLogRepository,
        TemperatureLogSortField,
    };
    use temperature_sensor as ts;

    #[actix_rt::test]
    async fn data_from_fridge_tag() {
        // util::init_logger(util::LogLevel::Warn);

        let ServiceTestContext { connection, .. } = setup_all_and_service_provider(
            "data_from_fridge_tag",
            MockDataInserts::none().names().stores(),
        )
        .await;

        let base_date = NaiveDate::from_ymd_opt(2024, 1, 1).unwrap();
        // This data is mapped to temperature log row insert and then to expected results
        // of temperature logs with associated breaches

        // MOCK DATA
        let log_data = vec![
            ((9, 1, 1), 3.0, "normal"),
            ((9, 15, 1), 9.0, "not captured by breach"),
            ((9, 30, 1), 3.0, "normal"),
            ((9, 45, 1), 3.0, "normal"),
            ((10, 1, 1), 3.0, "normal"),
            ((10, 15, 1), 10.0, "hotcumulative"),
            ((10, 30, 1), 8.1, "hotcumulative"),
            ((10, 45, 1), 3.0, "normal"),
            ((11, 1, 2), 8.5, "hotconsecutive"),
            ((11, 15, 1), 8.6, "hotconsecutive"),
            ((11, 30, 1), 8.2, "hotconsecutive"),
            ((11, 45, 1), 8.9, "hotconsecutive"),
            ((12, 1, 1), 8.1, "hotconsecutive"),
            ((12, 15, 1), 8.9, "hotconsecutive"),
            ((12, 30, 1), 10.0, "hotcumulative"),
            ((12, 45, 1), 11.0, "hotcumulative"),
            ((13, 1, 1), 9.0, "hotcumulative"),
            ((13, 15, 1), 8.6, "hotcumulative"),
            // s2 = step two
            ((13, 30, 1), 10.1, "s2-hotcumulative"),
            ((13, 45, 1), -1.0, "s2-coldcumulative"),
            ((14, 1, 1), 9.0, "s2-hotcumulative"),
        ];

        let s2_log_data = vec![
            ((14, 15, 1), 7.0, "normal"),
            ((14, 30, 1), 9.0, "s2-hotcumulative"),
            ((14, 45, 1), 1.5, "s2-coldcumulative"),
            ((15, 1, 1), 1.1, "s2-coldconsecutive"),
            ((15, 15, 1), 0.5, "s2-coldconsecutive"),
            ((15, 30, 1), -3.0, "s2-coldconsecutive"),
            ((15, 45, 1), 0.0, "s2-coldcumulative"),
            ((16, 1, 1), -2.5, "s2-coldcumulative"),
            ((16, 15, 1), 3.0, "normal"),
        ];

        let breach_data = vec![
            (
                ts::BreachType::HotCumulative,
                base_date.and_hms_opt(10, 1, 1).unwrap(), // Start
                base_date.and_hms_opt(13, 20, 1).unwrap(), // Finish
            ),
            (
                ts::BreachType::HotConsecutive,
                base_date.and_hms_opt(11, 1, 1).unwrap(), // Start
                base_date.and_hms_opt(12, 20, 1).unwrap(), // Finish
            ),
        ];

        let s2_breach_data = vec![
            (
                ts::BreachType::HotCumulative,
                base_date.and_hms_opt(10, 1, 1).unwrap(), // Start
                base_date.and_hms_opt(14, 30, 1).unwrap(), // Finish - Updated
            ),
            // Added
            (
                ts::BreachType::ColdConsecutive,
                base_date.and_hms_opt(15, 1, 1).unwrap(), // Start
                base_date.and_hms_opt(15, 30, 1).unwrap(), // Finish
            ),
            (
                ts::BreachType::ColdCumulative,
                base_date.and_hms_opt(13, 45, 1).unwrap(), // Start
                base_date.and_hms_opt(16, 1, 1).unwrap(),  // Finish
            ),
            // Previous
            (
                ts::BreachType::HotConsecutive,
                base_date.and_hms_opt(11, 1, 1).unwrap(), // Start
                base_date.and_hms_opt(12, 20, 1).unwrap(), // Finish
            ),
        ];

        let configs = Some(vec![
            ts::TemperatureBreachConfig {
                breach_type: ts::BreachType::HotCumulative,
                maximum_temperature: 8.0,
                minimum_temperature: -273.0,
                duration: Duration::minutes(60),
            },
            ts::TemperatureBreachConfig {
                breach_type: ts::BreachType::HotConsecutive,
                maximum_temperature: 8.0,
                minimum_temperature: -273.0,
                duration: Duration::minutes(5),
            },
            ts::TemperatureBreachConfig {
                breach_type: ts::BreachType::ColdConsecutive,
                maximum_temperature: 100.0,
                minimum_temperature: 2.0,
                duration: Duration::minutes(5),
            },
            ts::TemperatureBreachConfig {
                breach_type: ts::BreachType::ColdCumulative,
                maximum_temperature: 100.0,
                minimum_temperature: 2.0,
                duration: Duration::minutes(60),
            },
        ]);

        // STEP 1
        let data = ts::Sensor {
            sensor_type: ts::SensorType::Berlinger,
            breaches: Some(
                breach_data
                    .into_iter()
                    .map(
                        |(breach_type, start_timestamp, end_timestamp)| ts::TemperatureBreach {
                            duration: end_timestamp - start_timestamp,
                            breach_type,
                            start_timestamp,
                            end_timestamp,
                            acknowledged: true,
                        },
                    )
                    .collect(),
            ),
            configs,
            logs: Some(
                log_data
                    .iter()
                    .map(|((h, mi, s), t, _)| ts::TemperatureLog {
                        temperature: *t,
                        timestamp: base_date.and_hms_opt(*h, *mi, *s).unwrap(),
                    })
                    .collect(),
            ),
            // Required, but not used fields
            serial: "sensor1_serial".to_string(),
            name: "sensor1_name".to_string(),
            last_connected_timestamp: None,
            log_interval: None,
        };

        // INTERGRATE MOCK DATA
        integrate_sensor_data(&connection, &mock_store_a().id, data.clone()).unwrap();

        // CHECK BREACHES
        let mut breaches = TemperatureBreachRepository::new(&connection)
            .query_by_filter(TemperatureBreachFilter::new())
            .unwrap();

        // Sort them
        breaches.sort_by(|a, b| {
            breach_sort_weight(&a.temperature_breach_row.r#type)
                .cmp(&breach_sort_weight(&b.temperature_breach_row.r#type))
        });

        assert_eq!(breaches.len(), 2);
        let s1_breaches = breaches
            .into_iter()
            .map(|b| b.temperature_breach_row)
            .collect::<Vec<TemperatureBreachRow>>();

        assert_eq!(
            s1_breaches,
            vec![
                TemperatureBreachRow {
                    duration_milliseconds: (60 + 19) * 60 * 1000,
                    r#type: TemperatureBreachType::HotConsecutive,
                    threshold_minimum: -273.0,
                    threshold_maximum: 8.0,
                    threshold_duration_milliseconds: 5 * 60 * 1000,
                    start_datetime: base_date.and_hms_opt(11, 1, 1).unwrap(),
                    end_datetime: base_date.and_hms_opt(12, 20, 1),
                    ..s1_breaches[0].clone()
                },
                TemperatureBreachRow {
                    duration_milliseconds: ((3 * 60) + 19) * 60 * 1000,
                    r#type: TemperatureBreachType::HotCumulative,
                    threshold_minimum: -273.0,
                    threshold_maximum: 8.0,
                    threshold_duration_milliseconds: 60 * 60 * 1000,
                    start_datetime: base_date.and_hms_opt(10, 1, 1).unwrap(),
                    end_datetime: base_date.and_hms_opt(13, 20, 1),
                    ..s1_breaches[1].clone()
                }
            ]
        );

        // CHECK LOGS
        type VecShape = Vec<(Option<NaiveDateTime>, f64, Option<String>)>;
        let logs = TemperatureLogRepository::new(&connection)
            .query(
                Pagination::all(),
                None,
                Some(Sort {
                    key: TemperatureLogSortField::Datetime,
                    desc: Some(false),
                }),
            )
            .unwrap()
            .into_iter()
            .map(|l| {
                // Map to (datetime, temperature, breach_id)
                (
                    Some(l.temperature_log_row.datetime),
                    l.temperature_log_row.temperature,
                    l.temperature_log_row.temperature_breach_id,
                )
            })
            .collect::<VecShape>();

        assert_eq!(
            logs,
            // Map to (datetime, temperature, breach_id)
            log_data
                .iter()
                .map(|((h, mi, s), t, desc)| (
                    base_date.and_hms_opt(*h, *mi, *s),
                    *t,
                    match *desc {
                        "hotconsecutive" => Some(s1_breaches[0].id.clone()),
                        "hotcumulative" => Some(s1_breaches[1].id.clone()),
                        _ => None,
                    }
                ))
                .collect::<VecShape>(),
        );

        // STEP 2
        // Use s2 data and add cold configs
        let s2_data = temperature_sensor::Sensor {
            breaches: Some(
                s2_breach_data
                    .into_iter()
                    .map(
                        |(breach_type, start_timestamp, end_timestamp)| ts::TemperatureBreach {
                            duration: end_timestamp - start_timestamp,
                            breach_type,
                            start_timestamp,
                            end_timestamp,
                            acknowledged: true,
                        },
                    )
                    .collect(),
            ),
            logs: Some(
                s2_log_data
                    .iter()
                    .map(|((h, mi, s), t, _)| ts::TemperatureLog {
                        temperature: *t,
                        timestamp: base_date.and_hms_opt(*h, *mi, *s).unwrap(),
                    })
                    .collect(),
            ),
            ..data.clone()
        };

        // INTERGRATE MOCK DATA
        integrate_sensor_data(&connection, &mock_store_a().id, s2_data).unwrap();

        // CHECK BREACHES
        let mut breaches = TemperatureBreachRepository::new(&connection)
            .query_by_filter(TemperatureBreachFilter::new())
            .unwrap();

        // Sort them
        breaches.sort_by(|a, b| {
            breach_sort_weight(&a.temperature_breach_row.r#type)
                .cmp(&breach_sort_weight(&b.temperature_breach_row.r#type))
        });

        assert_eq!(breaches.len(), 4); // Now 4
        let s2_breaches = breaches
            .into_iter()
            .map(|b| b.temperature_breach_row)
            .collect::<Vec<TemperatureBreachRow>>();

        assert_eq!(
            s2_breaches,
            vec![
                TemperatureBreachRow {
                    duration_milliseconds: (29) * 60 * 1000,
                    r#type: TemperatureBreachType::ColdConsecutive,
                    threshold_minimum: 2.0,
                    threshold_maximum: 100.0,
                    threshold_duration_milliseconds: 5 * 60 * 1000,
                    start_datetime: base_date.and_hms_opt(15, 1, 1).unwrap(),
                    end_datetime: base_date.and_hms_opt(15, 30, 1),
                    ..s2_breaches[0].clone()
                },
                s1_breaches[0].clone(), // Hot consecutive didn't change
                TemperatureBreachRow {
                    duration_milliseconds: ((2 * 60) + 15 + 1) * 60 * 1000,
                    r#type: TemperatureBreachType::ColdCumulative,
                    threshold_minimum: 2.0,
                    threshold_maximum: 100.0,
                    threshold_duration_milliseconds: 60 * 60 * 1000,
                    start_datetime: base_date.and_hms_opt(13, 45, 1).unwrap(),
                    end_datetime: base_date.and_hms_opt(16, 1, 1),
                    ..s2_breaches[2].clone()
                },
                TemperatureBreachRow {
                    // Only duration and end_datetime changed for Hot cumulative
                    duration_milliseconds: ((4 * 60) + 29) * 60 * 1000,
                    end_datetime: base_date.and_hms_opt(14, 30, 1),
                    ..s1_breaches[1].clone()
                }
            ]
        );

        // CHECK LOGS
        let logs = TemperatureLogRepository::new(&connection)
            .query(
                Pagination::all(),
                None,
                Some(Sort {
                    key: TemperatureLogSortField::Datetime,
                    desc: Some(false),
                }),
            )
            .unwrap()
            .into_iter()
            .map(|l| {
                // Map to (datetime, temperature, breach_id)
                (
                    Some(l.temperature_log_row.datetime),
                    l.temperature_log_row.temperature,
                    l.temperature_log_row.temperature_breach_id,
                )
            })
            .collect::<VecShape>();

        assert_eq!(
            logs,
            // Map to (datetime, temperature, breach_id)
            log_data
                .iter()
                .chain(s2_log_data.iter())
                .map(|((h, mi, s), t, desc)| (
                    base_date.and_hms_opt(*h, *mi, *s),
                    *t,
                    match *desc {
                        "hotconsecutive" => Some(s2_breaches[1].id.clone()),
                        "hotcumulative" | "s2-hotcumulative" => Some(s2_breaches[3].id.clone()),
                        "s2-coldconsecutive" => Some(s2_breaches[0].id.clone()),
                        "s2-coldcumulative" => Some(s2_breaches[2].id.clone()),
                        _ => None,
                    }
                ))
                .collect::<VecShape>(),
        );
    }
}
