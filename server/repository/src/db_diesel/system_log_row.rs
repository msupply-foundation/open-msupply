use crate::{ChangeLogInsertRow, ChangelogRepository, ChangelogTableName, RowActionType, ChangelogSyncType, Upsert};
use crate::{RepositoryError, SourceSiteIdForChangelog, StorageConnection};

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

impl SystemLogRow {
    pub fn changelog(
        record_id: String,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: SourceSiteIdForChangelog,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::SystemLog,
            record_id,
            row_action: action,
            store_id: None,
            name_id: None,
            source_site_id: source_site_id.get_id(con)?,
            ..Default::default()
        })
    }
}

pub struct SystemLogRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> SystemLogRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        SystemLogRowRepository { connection }
    }

    pub fn _insert_one(&self, row: &SystemLogRow) -> Result<(), RepositoryError> {
        diesel::insert_into(system_log::table)
            .values(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn insert_one(&self, row: &SystemLogRow) -> Result<i64, RepositoryError> {
        self._insert_one(row)?;
        let changelog = SystemLogRow::changelog(
            row.id.clone(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteIdForChangelog::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
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

    pub fn find_all(&self) -> Result<Vec<SystemLogRow>, RepositoryError> {
        let result = system_log::table.load(self.connection.lock().connection())?;
        Ok(result)
    }
}

impl Upsert for SystemLogRow {
    fn upsert_sync(&self, con: &StorageConnection, sync_type: ChangelogSyncType) -> Result<(), RepositoryError> {
        SystemLogRowRepository::new(con)._insert_one(self)?;

        let changelog = match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => Self::changelog(
                self.id.clone(),
                con,
                RowActionType::Upsert,
                SourceSiteIdForChangelog::SourceSiteId(source_site_id),
            )?,
            ChangelogSyncType::SyncTypeV7 { changelog_row } => changelog_row,
        };

        ChangelogRepository::new(con).insert(&changelog)?;
        Ok(())
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
