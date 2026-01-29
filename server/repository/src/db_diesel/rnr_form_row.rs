use super::{
    name_row::name, period_row::period,
    period_schedule_row::period_schedule, program_row::program,
    store_row::store, StorageConnection,
};
use crate::{
    diesel_macros::define_linked_tables,
    ChangeLogInsertRow, ChangelogRepository, ChangelogTableName, Delete, RepositoryError,
    RowActionType, Upsert,
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

pub struct RnRFormRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> RnRFormRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        RnRFormRowRepository { connection }
    }

    pub fn upsert_one(&self, rnr_form_row: &RnRFormRow) -> Result<i64, RepositoryError> {
        self._upsert(rnr_form_row)?;
        self.insert_changelog(rnr_form_row.to_owned(), RowActionType::Upsert)
    }

    fn insert_changelog(
        &self,
        row: RnRFormRow,
        action: RowActionType,
    ) -> Result<i64, RepositoryError> {
        let row = ChangeLogInsertRow {
            table_name: ChangelogTableName::RnrForm,
            record_id: row.id,
            row_action: action,
            store_id: Some(row.store_id),
            name_link_id: Some(row.name_id),
        };

        ChangelogRepository::new(self.connection).insert(&row)
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
        let old_row = self.find_one_by_id(rnr_form_id)?;
        let change_log_id = match old_row {
            Some(old_row) => self.insert_changelog(old_row, RowActionType::Delete)?,
            None => {
                return Ok(None);
            }
        };

        diesel::delete(rnr_form_with_links::table.filter(rnr_form_with_links::id.eq(rnr_form_id)))
            .execute(self.connection.lock().connection())?;
        Ok(Some(change_log_id))
    }
}

#[derive(Debug, Clone)]
pub struct RnRFormDelete(pub String);
// For tests only
impl Delete for RnRFormDelete {
    fn delete(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        RnRFormRowRepository::new(con).delete(&self.0)
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
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        let cursor_id = RnRFormRowRepository::new(con).upsert_one(self)?;
        Ok(Some(cursor_id))
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            RnRFormRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
