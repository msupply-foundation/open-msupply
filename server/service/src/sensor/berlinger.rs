use anyhow::Context;
use chrono::{Local, LocalResult, NaiveDateTime, TimeZone};
use repository::{DatetimeFilter, EqualFilter};
use repository::{
    RepositoryError, Sensor, SensorFilter, SensorRepository, SensorRow, SensorRowRepository,
    SensorType, StorageConnection, TemperatureBreach, TemperatureBreachConfig,
    TemperatureBreachConfigFilter, TemperatureBreachConfigRepository, TemperatureBreachConfigRow,
    TemperatureBreachConfigRowRepository, TemperatureBreachFilter, TemperatureBreachRepository,
    TemperatureBreachRow, TemperatureBreachRowRepository, TemperatureBreachRowType, TemperatureLog,
    TemperatureLogFilter, TemperatureLogRepository, TemperatureLogRow, TemperatureLogRowRepository,
};
use serde::Serialize;
use std::path::PathBuf;
use thiserror::Error;
use util::uuid::uuid;

use temperature_sensor::*;

pub fn get_breach_row_type(breach_type: &BreachType) -> TemperatureBreachRowType {
    match breach_type {
        BreachType::ColdConsecutive => TemperatureBreachRowType::ColdConsecutive,
        BreachType::ColdCumulative => TemperatureBreachRowType::ColdCumulative,
        BreachType::HotConsecutive => TemperatureBreachRowType::HotConsecutive,
        BreachType::HotCumulative => TemperatureBreachRowType::HotCumulative,
    }
}

pub fn get_matching_sensor_serial(
    connection: &StorageConnection,
    serial: &str,
) -> Result<Vec<Sensor>, RepositoryError> {
    SensorRepository::new(connection)
        .query_by_filter(SensorFilter::new().serial(EqualFilter::equal_to(&serial)))
}

pub fn get_matching_sensor_log(
    connection: &StorageConnection,
    sensor_id: &str,
    datetime: NaiveDateTime,
) -> Result<Vec<TemperatureLog>, RepositoryError> {
    let filter = TemperatureLogFilter::new()
        .sensor(SensorFilter::new().id(EqualFilter::equal_to(sensor_id)))
        .datetime(DatetimeFilter::equal_to(datetime));

    TemperatureLogRepository::new(connection).query_by_filter(filter)
}

pub fn get_matching_sensor_breach_config(
    connection: &StorageConnection,
    description: &str,
    breach_type: &TemperatureBreachRowType,
) -> Result<Vec<TemperatureBreachConfig>, RepositoryError> {
    let filter = TemperatureBreachConfigFilter::new()
        .description(EqualFilter::equal_to(description))
        .r#type(EqualFilter::equal_to_breach_type(&breach_type));

    TemperatureBreachConfigRepository::new(connection).query_by_filter(filter)
}

pub fn get_matching_sensor_breach(
    connection: &StorageConnection,
    sensor_id: &str,
    start_datetime: NaiveDateTime,
    _end_datetime: NaiveDateTime,
    breach_type: &TemperatureBreachRowType,
) -> Result<Vec<TemperatureBreach>, RepositoryError> {
    let filter = TemperatureBreachFilter::new()
        .sensor(SensorFilter::new().id(EqualFilter::equal_to(sensor_id)))
        .r#type(EqualFilter::equal_to_breach_type(&breach_type))
        .start_datetime(DatetimeFilter::equal_to(start_datetime));

    TemperatureBreachRepository::new(connection).query_by_filter(filter)
}

pub fn get_logs_for_sensor(
    connection: &StorageConnection,
    sensor_id: &str,
) -> Result<Vec<TemperatureLog>, RepositoryError> {
    TemperatureLogRepository::new(connection).query_by_filter(
        TemperatureLogFilter::new()
            .sensor(SensorFilter::new().id(EqualFilter::equal_to(sensor_id))),
    )
}

pub fn get_breaches_for_sensor(
    connection: &StorageConnection,
    sensor_id: &str,
) -> Result<Vec<TemperatureBreach>, RepositoryError> {
    TemperatureBreachRepository::new(connection).query_by_filter(
        TemperatureBreachFilter::new()
            .sensor(SensorFilter::new().id(EqualFilter::equal_to(sensor_id)))
            .unacknowledged(true),
    )
}

pub fn get_breach_configs_for_sensor(
    connection: &StorageConnection,
    _sensor_id: &str,
) -> Result<Vec<TemperatureBreachConfig>, RepositoryError> {
    TemperatureBreachConfigRepository::new(connection)
        .query_by_filter(TemperatureBreachConfigFilter::new().is_active(true))
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
) -> Result<(), RepositoryError> {
    let breach_row_type = get_breach_row_type(&temperature_breach.breach_type);
    let result = get_matching_sensor_breach(
        connection,
        &sensor_row.id,
        temperature_breach.start_timestamp,
        temperature_breach.end_timestamp,
        &breach_row_type,
    )?;

    if let Some(mut record) = result.clone().pop() {
        if record.temperature_breach_row.end_datetime != Some(temperature_breach.end_timestamp) {
            // Update breach end time if it has changed
            record.temperature_breach_row.end_datetime = Some(temperature_breach.end_timestamp);
            TemperatureBreachRowRepository::new(connection)
                .upsert_one(&record.temperature_breach_row)?;
        }
        Ok(())
    } else {
        let new_temperature_breach = TemperatureBreachRow {
            id: uuid(),
            store_id: sensor_row.store_id.clone(),
            sensor_id: sensor_row.id.clone(),
            location_id: sensor_row.location_id.clone(),
            start_datetime: temperature_breach.start_timestamp,
            end_datetime: Some(temperature_breach.end_timestamp),
            unacknowledged: true,
            duration_milliseconds: temperature_breach.duration.num_seconds() as i32,
            r#type: breach_row_type,
            threshold_duration_milliseconds: breach_config.duration.num_seconds() as i32,
            threshold_minimum: breach_config.minimum_temperature,
            threshold_maximum: breach_config.maximum_temperature,
            comment: None,
        };
        TemperatureBreachRowRepository::new(connection).upsert_one(&new_temperature_breach)?;
        log::info!("Added sensor breach {:?} ", new_temperature_breach);
        Ok(())
    }
}

fn sensor_add_breach_config_if_new(
    connection: &StorageConnection,
    sensor_row: &SensorRow,
    temperature_breach_config: &temperature_sensor::TemperatureBreachConfig,
) -> Result<(), RepositoryError> {
    let mut config_description = format!(
        "for {} minutes",
        temperature_breach_config.duration.num_minutes()
    );
    let breach_row_type = get_breach_row_type(&temperature_breach_config.breach_type);

    match temperature_breach_config.breach_type {
        BreachType::ColdConsecutive => {
            config_description = format!(
                "Consecutive {} colder than {}",
                config_description, temperature_breach_config.minimum_temperature
            )
        }
        BreachType::ColdCumulative => {
            config_description = format!(
                "Cumulative {} colder than {}",
                config_description, temperature_breach_config.minimum_temperature
            )
        }
        BreachType::HotConsecutive => {
            config_description = format!(
                "Consecutive {} hotter than {}",
                config_description, temperature_breach_config.maximum_temperature
            )
        }
        BreachType::HotCumulative => {
            config_description = format!(
                "Cumulative {} hotter than {}",
                config_description, temperature_breach_config.maximum_temperature
            )
        }
    }

    let result =
        get_matching_sensor_breach_config(connection, &config_description, &breach_row_type)?;

    if !result.is_empty() {
        return Ok(());
    };

    let new_temperature_breach_config = TemperatureBreachConfigRow {
        id: uuid(),
        store_id: sensor_row.store_id.clone(),
        is_active: true,
        description: config_description.clone(),
        duration_milliseconds: temperature_breach_config.duration.num_seconds() as i32,
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
    let mut temperature_sensor = convert_from_localtime(&temperature_sensor_unmapped)?;

    let new_sensor_id = sensor_add_if_new(connection, &store_id, &temperature_sensor)?;

    let result = get_matching_sensor_serial(connection, &temperature_sensor.serial)?;

    let record = result
        .clone()
        .pop()
        .context("Sensor could not be inserted or found in database")?;

    // Filter sensor data by previous last connected time
    let last_connected = record.sensor_row.last_connection_datetime;
    temperature_sensor =
        temperature_sensor::filter_sensor(temperature_sensor, last_connected, None);

    let temperature_sensor_configs = temperature_sensor.configs.unwrap_or_default();
    for temperature_sensor_config in temperature_sensor_configs.iter() {
        sensor_add_breach_config_if_new(
            connection,
            &record.sensor_row,
            &temperature_sensor_config,
        )?;
    }

    let temperature_sensor_breaches = temperature_sensor.breaches.unwrap_or_default();
    let temperature_sensor_logs = temperature_sensor.logs.unwrap_or_default();

    let result = ReadSensor {
        number_of_logs: temperature_sensor_logs.len() as u32,
        number_of_breaches: temperature_sensor_breaches.len() as u32,
        new_sensor_id,
    };

    for temperature_sensor_breach in temperature_sensor_breaches {
        // Look up matching config from the USB data and snapshot it as part of the breach
        if let Some(temperature_sensor_config) = temperature_sensor_configs
            .iter()
            .find(|&t| t.breach_type == temperature_sensor_breach.breach_type)
        {
            sensor_add_breach_if_new(
                connection,
                &record.sensor_row,
                &temperature_sensor_breach,
                &temperature_sensor_config,
            )?;
        }
    }

    for temperature_sensor_log in temperature_sensor_logs {
        sensor_add_log_if_new(connection, &record.sensor_row, &temperature_sensor_log)?;
    }

    // Finally, update sensor's last connected time if it has changed
    if record.sensor_row.last_connection_datetime != temperature_sensor.last_connected_timestamp {
        SensorRowRepository::new(connection).upsert_one(&SensorRow {
            last_connection_datetime: temperature_sensor.last_connected_timestamp,
            ..record.sensor_row
        })?;
    }

    Ok(result)
}

// TODO tests
