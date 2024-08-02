use super::{
    store_row::store,
    temperature_breach_config_row::temperature_breach_config::dsl as temperature_breach_config_dsl,
    temperature_breach_row::TemperatureBreachType, temperature_log_row::temperature_log,
    StorageConnection,
};

use crate::repository_error::RepositoryError;
use crate::{ChangeLogInsertRow, ChangelogRepository, ChangelogTableName, RowActionType};

use diesel::prelude::*;

table! {
    temperature_breach_config (id) {
        id -> Text,
        duration_milliseconds -> Integer,
        #[sql_name = "type"] type_ -> crate::db_diesel::temperature_breach_row::TemperatureBreachTypeMapping,
        description -> Text,
        is_active -> Bool,
        store_id -> Text,
        minimum_temperature -> Double,
        maximum_temperature -> Double,
    }
}

joinable!(temperature_breach_config -> store (store_id));

allow_tables_to_appear_in_same_query!(temperature_breach_config, temperature_log);

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Default)]
#[diesel(treat_none_as_null = true)]
#[diesel(table_name = temperature_breach_config)]
pub struct TemperatureBreachConfigRow {
    pub id: String,
    pub duration_milliseconds: i32,
    #[diesel(column_name = "type_")]
    pub r#type: TemperatureBreachType,
    pub description: String,
    pub is_active: bool,
    pub store_id: String,
    pub minimum_temperature: f64,
    pub maximum_temperature: f64,
}

pub struct TemperatureBreachConfigRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> TemperatureBreachConfigRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        TemperatureBreachConfigRowRepository { connection }
    }

    pub fn upsert_one(&self, row: &TemperatureBreachConfigRow) -> Result<i64, RepositoryError> {
        diesel::insert_into(temperature_breach_config_dsl::temperature_breach_config)
            .values(row)
            .on_conflict(temperature_breach_config_dsl::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        self.insert_changelog(row, RowActionType::Upsert)
    }

    fn insert_changelog(
        &self,
        row: &TemperatureBreachConfigRow,
        action: RowActionType,
    ) -> Result<i64, RepositoryError> {
        let row = ChangeLogInsertRow {
            table_name: ChangelogTableName::TemperatureBreachConfig,
            record_id: row.id.clone(),
            row_action: action,
            store_id: Some(row.store_id.clone()),
            name_link_id: None,
        };

        ChangelogRepository::new(self.connection).insert(&row)
    }

    pub fn find_one_by_id(
        &self,
        id: &str,
    ) -> Result<Option<TemperatureBreachConfigRow>, RepositoryError> {
        let result = temperature_breach_config_dsl::temperature_breach_config
            .filter(temperature_breach_config_dsl::id.eq(id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_many_by_id(
        &self,
        ids: &[String],
    ) -> Result<Vec<TemperatureBreachConfigRow>, RepositoryError> {
        Ok(temperature_breach_config_dsl::temperature_breach_config
            .filter(temperature_breach_config_dsl::id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }
}
