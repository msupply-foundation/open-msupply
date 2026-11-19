use super::{StorageConnection, sensor_row::sensor, store_row::store};

use crate::diesel_macros::diesel_string_enum;
use crate::{ChangelogRepository, RowActionType};
use crate::{ChangelogSyncType, SourceSiteId, Upsert, repository_error::RepositoryError};

use chrono::NaiveDateTime;
use diesel::prelude::*;
use std::any::Any;

diesel_string_enum! {
    db_case = SCREAMING_SNAKE_CASE;
    #[derive(Clone, Eq)]
    #[strum(serialize_all = "SCREAMING_SNAKE_CASE")]
    // Stored as plain TEXT (not a native DB enum) for v7 forwards-compatibility: a period added
    // on a newer central (e.g. hourly or weekly) is captured into `Other(String)` rather than
    // rejected at insert.
    pub enum TemperatureSummaryPeriod {
        #[default]
        Day,
        #[strum(default, transparent)]
        Other(String),
    }
}

table! {
    temperature_summary (id) {
        id -> Text,
        store_id -> Text,
        sensor_id -> Text,
        location_id -> Nullable<Text>,
        period -> diesel::sql_types::Text,
        start_datetime -> Timestamp,
        end_datetime -> Timestamp,
        minimum_temperature -> Nullable<Double>,
        maximum_temperature -> Nullable<Double>,
        average_temperature -> Nullable<Double>,
        hot_duration_milliseconds -> Nullable<Integer>,
        cold_duration_milliseconds -> Nullable<Integer>,
        hot_threshold -> Nullable<Double>,
        cold_threshold -> Nullable<Double>,
    }
}

joinable!(temperature_summary -> sensor (sensor_id));
joinable!(temperature_summary -> store (store_id));

/// A sensor's own summary of a period, as recorded by the sensor (e.g. a day of a Fridge-tag's
/// history). The period starts at `start_datetime`, and the summary covers it up to
/// `end_datetime`: the end of the period, or when the sensor was read if the period was still in
/// progress (so a summary is partial when it ends before its period does). The hot & cold
/// durations are the total time above `hot_threshold` / below `cold_threshold`, whether or not an
/// alarm (breach) was triggered. A sensor has one summary per period and start.
#[derive(
    Clone,
    Queryable,
    Insertable,
    AsChangeset,
    Debug,
    PartialEq,
    Default,
    serde::Serialize,
    serde::Deserialize,
)]
#[diesel(treat_none_as_null = true)]
#[diesel(table_name = temperature_summary)]
pub struct TemperatureSummaryRow {
    pub id: String,
    pub store_id: String,
    pub sensor_id: String,
    pub location_id: Option<String>,
    pub period: TemperatureSummaryPeriod,
    pub start_datetime: NaiveDateTime,
    pub end_datetime: NaiveDateTime,
    pub minimum_temperature: Option<f64>,
    pub maximum_temperature: Option<f64>,
    pub average_temperature: Option<f64>,
    pub hot_duration_milliseconds: Option<i32>,
    pub cold_duration_milliseconds: Option<i32>,
    pub hot_threshold: Option<f64>,
    pub cold_threshold: Option<f64>,
}

pub struct TemperatureSummaryRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> TemperatureSummaryRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        TemperatureSummaryRowRepository { connection }
    }

    pub fn _upsert_one(&self, row: &TemperatureSummaryRow) -> Result<(), RepositoryError> {
        diesel::insert_into(temperature_summary::table)
            .values(row)
            .on_conflict(temperature_summary::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(&self, row: &TemperatureSummaryRow) -> Result<(), RepositoryError> {
        self._upsert_one(row)?;
        let changelog = row.generate_changelog(
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub fn find_one_by_id(
        &self,
        id: &str,
    ) -> Result<Option<TemperatureSummaryRow>, RepositoryError> {
        let result = temperature_summary::table
            .filter(temperature_summary::id.eq(id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    /// The summary of the same period as `row`: a sensor has one summary per period and start.
    /// Used to update a summary that was still in progress when the sensor was last read, and to
    /// de-duplicate summaries that arrive from multiple devices reading the same sensor (each
    /// device assigns its own `id`).
    pub fn find_one_for_same_period(
        &self,
        row: &TemperatureSummaryRow,
    ) -> Result<Option<TemperatureSummaryRow>, RepositoryError> {
        let result = temperature_summary::table
            .filter(temperature_summary::sensor_id.eq(&row.sensor_id))
            .filter(temperature_summary::period.eq(&row.period))
            .filter(temperature_summary::start_datetime.eq(row.start_datetime))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_many_by_id(
        &self,
        ids: &[String],
    ) -> Result<Vec<TemperatureSummaryRow>, RepositoryError> {
        Ok(temperature_summary::table
            .filter(temperature_summary::id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }

    pub fn find_many_by_sensor_id(
        &self,
        sensor_id: &str,
    ) -> Result<Vec<TemperatureSummaryRow>, RepositoryError> {
        Ok(temperature_summary::table
            .filter(temperature_summary::sensor_id.eq(sensor_id))
            .order(temperature_summary::start_datetime.asc())
            .load(self.connection.lock().connection())?)
    }
}

impl Upsert for TemperatureSummaryRow {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        TemperatureSummaryRowRepository::new(con)._upsert_one(self)?;

        let changelog = match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => self.generate_changelog(
                con,
                RowActionType::Upsert,
                SourceSiteId::SourceSiteId(source_site_id),
            )?,
            ChangelogSyncType::SyncTypeV7 { changelog_row } => changelog_row,
        };

        ChangelogRepository::new(con).insert(&changelog)?;
        Ok(())
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            TemperatureSummaryRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }

    fn as_mut_any(&mut self) -> Option<&mut dyn Any> {
        Some(self)
    }
}
