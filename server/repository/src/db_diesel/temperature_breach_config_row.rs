use super::{
    store_row::store,
    temperature_breach_config_row::temperature_breach_config::dsl as temperature_breach_config_dsl,
    temperature_breach_row::TemperatureBreachRowType, StorageConnection,
};

use crate::repository_error::RepositoryError;
use diesel::prelude::*;

table! {
    temperature_breach_config (id) {
        id -> Text,
        duration -> Integer,
        #[sql_name = "type"] type_ -> crate::db_diesel::temperature_breach_row::TemperatureBreachRowTypeMapping,
        description -> Text,
        is_active -> Bool,
        store_id -> Nullable<Text>,
        minimum_temperature -> Float,
        maximum_temperature -> Float,
    }
}

table! {
    #[sql_name = "temperature_breach_config"]
    temperature_breach_config_is_sync_update (id) {
        id -> Text,
        is_sync_update -> Bool,
    }
}

joinable!(temperature_breach_config -> store (store_id));

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq)]
#[changeset_options(treat_none_as_null = "true")]
#[table_name = "temperature_breach_config"]
pub struct TemperatureBreachConfigRow {
    pub id: String,
    pub duration: i32,
    #[column_name = "type_"]
    pub r#type: TemperatureBreachRowType,
    pub description: String,
    pub is_active: bool,
    pub store_id: Option<String>,
    pub minimum_temperature: f32,
    pub maximum_temperature: f32,
}

impl Default for TemperatureBreachConfigRow {
    fn default() -> Self {
        TemperatureBreachConfigRow {
            id: Default::default(),
            duration: Default::default(),
            r#type: TemperatureBreachRowType::HotConsecutive,
            description: Default::default(),
            is_active: false,
            store_id: None,
            minimum_temperature: Default::default(),
            maximum_temperature: Default::default(),
        }
    }
}
pub struct TemperatureBreachConfigRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> TemperatureBreachConfigRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        TemperatureBreachConfigRowRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn _upsert_one(&self, row: &TemperatureBreachConfigRow) -> Result<(), RepositoryError> {
        diesel::insert_into(temperature_breach_config_dsl::temperature_breach_config)
            .values(row)
            .on_conflict(temperature_breach_config_dsl::id)
            .do_update()
            .set(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn _upsert_one(&self, row: &TemperatureBreachConfigRow) -> Result<(), RepositoryError> {
        diesel::replace_into(temperature_breach_config_dsl::temperature_breach_config)
            .values(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn upsert_one(&self, row: &TemperatureBreachConfigRow) -> Result<(), RepositoryError> {
        self._upsert_one(row)?;
        Ok(())
    }

    pub fn find_one_by_id(
        &self,
        id: &str,
    ) -> Result<Option<TemperatureBreachConfigRow>, RepositoryError> {
        let result = temperature_breach_config_dsl::temperature_breach_config
            .filter(temperature_breach_config_dsl::id.eq(id))
            .first(&self.connection.connection)
            .optional()?;
        Ok(result)
    }

    pub fn find_many_by_id(
        &self,
        ids: &[String],
    ) -> Result<Vec<TemperatureBreachConfigRow>, RepositoryError> {
        Ok(temperature_breach_config_dsl::temperature_breach_config
            .filter(temperature_breach_config_dsl::id.eq_any(ids))
            .load(&self.connection.connection)?)
    }
}
