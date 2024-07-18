use crate::{
    ChangeLogInsertRow, ChangelogRepository, ChangelogTableName, RepositoryError, RowActionType,
    StorageConnection, Upsert,
};

use super::{
    name_link_row::name_link, name_row::name, period_row::period,
    period_schedule_row::period_schedule, program_row::program, rnr_form_row::rnr_form::dsl::*,
    store_row::store,
};

use chrono::NaiveDateTime;
use diesel_derive_enum::DbEnum;
use serde::{Deserialize, Serialize};

use diesel::prelude::*;

table! {
    rnr_form (id) {
        id -> Text,
        store_id -> Text,
        name_link_id -> Text,
        period_id -> Text,
        program_id -> Text,
        created_datetime -> Timestamp,
        finalised_datetime -> Nullable<Timestamp>,
        status -> crate::db_diesel::rnr_form_row::RnRFormStatusMapping,
        linked_requisition_id -> Nullable<Text>,
    }
}

joinable!(rnr_form -> store (store_id));
joinable!(rnr_form -> name_link (name_link_id));
joinable!(rnr_form -> period (period_id));
joinable!(rnr_form -> program (program_id));

allow_tables_to_appear_in_same_query!(rnr_form, store);
allow_tables_to_appear_in_same_query!(rnr_form, name_link);
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
    pub name_link_id: String,
    pub period_id: String,
    pub program_id: String,
    pub created_datetime: NaiveDateTime,
    pub finalised_datetime: Option<NaiveDateTime>,
    pub status: RnRFormStatus,
    pub linked_requisition_id: Option<String>,
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

    pub fn _upsert_one(&self, rnr_form_row: &RnRFormRow) -> Result<(), RepositoryError> {
        diesel::insert_into(rnr_form)
            .values(rnr_form_row)
            .on_conflict(id)
            .do_update()
            .set(rnr_form_row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(&self, rnr_form_row: &RnRFormRow) -> Result<i64, RepositoryError> {
        self._upsert_one(rnr_form_row)?;
        self.insert_changelog(rnr_form_row.id.to_owned(), RowActionType::Upsert)
    }

    fn insert_changelog(
        &self,
        record_id: String,
        action: RowActionType,
    ) -> Result<i64, RepositoryError> {
        let row = ChangeLogInsertRow {
            table_name: ChangelogTableName::RnRForm,
            record_id,
            row_action: action,
            store_id: None,
            name_link_id: None,
        };

        ChangelogRepository::new(self.connection).insert(&row)
    }

    pub fn find_all(&self) -> Result<Vec<RnRFormRow>, RepositoryError> {
        let result = rnr_form.load(self.connection.lock().connection())?;
        Ok(result)
    }

    pub fn find_one_by_id(&self, rnr_form_id: &str) -> Result<Option<RnRFormRow>, RepositoryError> {
        let result = rnr_form
            .filter(id.eq(rnr_form_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn delete(&self, rnr_form_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(rnr_form)
            .filter(id.eq(rnr_form_id))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }
}

impl Upsert for RnRFormRow {
    fn upsert_sync(&self, con: &StorageConnection) -> Result<(), RepositoryError> {
        let _change_log_id = RnRFormRowRepository::new(con).upsert_one(self)?;
        Ok(())
    }

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
