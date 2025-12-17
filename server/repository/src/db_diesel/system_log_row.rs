use crate::{ChangeLogInsertRow, ChangelogRepository, ChangelogTableName, RowActionType, Upsert};
use crate::{RepositoryError, StorageConnection};

use chrono::NaiveDateTime;
use diesel::prelude::*;
use diesel_derive_enum::DbEnum;
use serde::{Deserialize, Serialize};
use strum::Display;

table! {
    system_log (id) {
        id -> Text,
        #[sql_name = "type"] type_ -> crate::db_diesel::system_log_row::SystemLogTypeMapping,
        sync_site_id -> Nullable<Integer>,
        datetime -> Timestamp,
        message -> Nullable<Text>,
        is_error -> Bool,
    }
}

#[derive(DbEnum, Default, Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Display)]
#[cfg_attr(test, derive(strum::EnumIter))]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum SystemLogType {
    #[default]
    ProcessorError,
    LedgerFixError,
    LedgerFix,
    Migration,
    ServerStatus,
}

impl SystemLogType {
    pub fn is_error(&self) -> bool {
        match self {
            SystemLogType::ProcessorError => true,
            SystemLogType::LedgerFixError => true,
            SystemLogType::LedgerFix => false,
            SystemLogType::Migration => false,
            SystemLogType::ServerStatus => false,
        }
    }
}

#[derive(
    Clone, Queryable, Insertable, AsChangeset, Default, Debug, PartialEq, Serialize, Deserialize,
)]
#[diesel(treat_none_as_null = true)]
#[diesel(table_name = system_log)]
pub struct SystemLogRow {
    pub id: String,
    #[diesel(column_name = type_)]
    pub r#type: SystemLogType,
    pub sync_site_id: Option<i32>,
    pub datetime: NaiveDateTime,
    pub message: Option<String>,
    pub is_error: bool,
}

pub struct SystemLogRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> SystemLogRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        SystemLogRowRepository { connection }
    }

    pub fn insert_one(&self, row: &SystemLogRow) -> Result<i64, RepositoryError> {
        diesel::insert_into(system_log::table)
            .values(row)
            .execute(self.connection.lock().connection())?;
        self.insert_changelog(row, RowActionType::Upsert)
    }

    fn insert_changelog(
        &self,
        row: &SystemLogRow,
        action: RowActionType,
    ) -> Result<i64, RepositoryError> {
        let row = ChangeLogInsertRow {
            table_name: ChangelogTableName::SystemLog,
            record_id: row.id.clone(),
            row_action: action,
            store_id: None,
            name_link_id: None,
        };

        ChangelogRepository::new(self.connection).insert(&row)
    }

    pub fn find_one_by_id(&self, log_id: &str) -> Result<Option<SystemLogRow>, RepositoryError> {
        let result = system_log::table
            .filter(system_log::id.eq(log_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn last_x_errors(&self, count: i64) -> Result<Vec<SystemLogRow>, RepositoryError> {
        let result = system_log::table
            .limit(count)
            .filter(system_log::is_error.eq(true))
            .get_results(self.connection.lock().connection())?;
        Ok(result)
    }
}

impl Upsert for SystemLogRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        let change_log_id = SystemLogRowRepository::new(con).insert_one(self)?;
        Ok(Some(change_log_id))
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            SystemLogRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use strum::IntoEnumIterator;
    use util::assert_matches;

    use crate::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn system_log_enum() {
        let (_, connection, _, _) = setup_all("system_log_enum", MockDataInserts::none()).await;

        let repo = SystemLogRowRepository::new(&connection);
        // Try upsert all variants, confirm that diesel enums match postgres
        for variant in SystemLogType::iter() {
            let id = variant.to_string();
            let result = repo.insert_one(&SystemLogRow {
                id: id.clone(),
                r#type: variant.clone(),
                ..Default::default()
            });
            assert_matches!(result, Ok(_));

            assert_matches!(repo.find_one_by_id(&id), Ok(Some(_)));
        }
    }
}
