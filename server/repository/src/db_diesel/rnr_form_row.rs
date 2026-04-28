use super::{
    name_row::name, period_row::period,
    period_schedule_row::period_schedule, program_row::program,
    store_row::store, StorageConnection,
};
use crate::{
    diesel_macros::define_linked_tables,
    ChangeLogInsertRow, ChangelogRepository, ChangelogTableName, ChangelogSyncType, Delete,
    KeyValueStoreRepository, RepositoryError, RowActionType, Upsert,
};

use chrono::NaiveDateTime;
use diesel::prelude::*;
use diesel_derive_enum::DbEnum;
use serde::{Deserialize, Serialize};

define_linked_tables! {
    view: rnr_form = "rnr_form_view",
    core: rnr_form_with_links = "rnr_form",
    struct: RnRFormRow,
    repo: RnRFormRowRepository,
    shared: {
        store_id -> Text,
        period_id -> Text,
        program_id -> Text,
        created_datetime -> Timestamp,
        finalised_datetime -> Nullable<Timestamp>,
        status -> crate::db_diesel::rnr_form_row::RnRFormStatusMapping,
        linked_requisition_id -> Nullable<Text>,
        their_reference -> Nullable<Text>,
        comment -> Nullable<Text>,
    },
    links: {
        name_link_id -> name_id,
    },
    optional_links: {
    }
}

joinable!(rnr_form -> store (store_id));
joinable!(rnr_form -> name (name_id));
joinable!(rnr_form -> period (period_id));
joinable!(rnr_form -> program (program_id));

allow_tables_to_appear_in_same_query!(rnr_form, store);
allow_tables_to_appear_in_same_query!(rnr_form, name);
allow_tables_to_appear_in_same_query!(rnr_form, period);
allow_tables_to_appear_in_same_query!(rnr_form, program);
allow_tables_to_appear_in_same_query!(rnr_form, period_schedule);

#[derive(
    Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset, Eq, Serialize, Deserialize, Default,
)]
#[diesel(table_name = rnr_form)]
#[diesel(treat_none_as_null = true)]
pub struct RnRFormRow {
    pub id: String,
    pub store_id: String,
    pub period_id: String,
    pub program_id: String,
    pub created_datetime: NaiveDateTime,
    pub finalised_datetime: Option<NaiveDateTime>,
    pub status: RnRFormStatus,
    pub linked_requisition_id: Option<String>,
    pub their_reference: Option<String>,
    pub comment: Option<String>,
    // Resolved from name_link - must be last to match view column order
    pub name_id: String,
}

#[derive(DbEnum, Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum RnRFormStatus {
    #[default]
    Draft,
    Finalised,
}

impl RnRFormRow {
    pub fn changelog(
        &self,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: Option<i32>,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::RnrForm,
            record_id: self.id.clone(),
            row_action: action,
            store_id: Some(self.store_id.clone()),
            name_id: Some(self.name_id.clone()),
            source_site_id: KeyValueStoreRepository::new(con).get_source_site_id(source_site_id)?,
            ..Default::default()
        })
    }

    pub fn delete_changelog(
        id: &str,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: Option<i32>,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        let row = RnRFormRowRepository::new(con)
            .find_one_by_id(id)?
            .ok_or(RepositoryError::NotFound)?;
        row.changelog(con, action, source_site_id)
    }
}

pub struct RnRFormRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> RnRFormRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        RnRFormRowRepository { connection }
    }

    pub fn upsert_one(&self, rnr_form_row: &RnRFormRow) -> Result<i64, RepositoryError> {
        self._upsert(rnr_form_row)?;
        let changelog = rnr_form_row.changelog(self.connection, RowActionType::Upsert, None)?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub fn find_all(&self) -> Result<Vec<RnRFormRow>, RepositoryError> {
        let result = rnr_form::table.load(self.connection.lock().connection())?;
        Ok(result)
    }

    pub fn find_one_by_id(&self, rnr_form_id: &str) -> Result<Option<RnRFormRow>, RepositoryError> {
        let result = rnr_form::table
            .filter(rnr_form::id.eq(rnr_form_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn delete(&self, rnr_form_id: &str) -> Result<Option<i64>, RepositoryError> {
        let changelog = match RnRFormRow::delete_changelog(rnr_form_id, self.connection, RowActionType::Delete, None) {
            Ok(changelog) => changelog,
            Err(RepositoryError::NotFound) => return Ok(None),
            Err(e) => return Err(e),
        };
        let change_log_id = ChangelogRepository::new(self.connection).insert(&changelog)?;

        diesel::delete(rnr_form_with_links::table.filter(rnr_form_with_links::id.eq(rnr_form_id)))
            .execute(self.connection.lock().connection())?;
        Ok(Some(change_log_id))
    }
}

#[derive(Debug, Clone)]
pub struct RnRFormDelete(pub String);
// For tests only
impl Delete for RnRFormDelete {
    fn delete_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        let changelog = match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => {
                RnRFormRow::delete_changelog(&self.0, con, RowActionType::Delete, source_site_id)?
            }
            ChangelogSyncType::SyncTypeV7 { changelog_row } => changelog_row,
        };

        diesel::delete(rnr_form_with_links::table.filter(rnr_form_with_links::id.eq(&self.0)))
            .execute(con.lock().connection())?;
        ChangelogRepository::new(con).insert(&changelog)?;
        Ok(())
    }
    // Test only
    fn assert_deleted(&self, con: &StorageConnection) {
        assert_eq!(
            RnRFormRowRepository::new(con).find_one_by_id(&self.0),
            Ok(None)
        )
    }
}

impl Upsert for RnRFormRow {
    fn upsert_sync(&self, con: &StorageConnection, sync_type: ChangelogSyncType) -> Result<(), RepositoryError> {
        RnRFormRowRepository::new(con)._upsert(self)?;

        let changelog = match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => {
                self.changelog(con, RowActionType::Upsert, source_site_id)?
            }
            ChangelogSyncType::SyncTypeV7 { changelog_row } => changelog_row,
        };

        ChangelogRepository::new(con).insert(&changelog)?;
        Ok(())
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            RnRFormRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
