use crate::{
    ChangeLogInsertRow, ChangelogRepository, ChangelogTableName, RepositoryError, RowActionType,
    StorageConnection, Upsert,
};

// TODO create joinable with tables that contain site_id
use super::feedback_form_row::feedback_form::dsl::*;

use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};

use diesel::prelude::*;

table! {
    feedback_form (id) {
        id -> Text,
        reply_email -> Text,
        body -> Text,
        created_datetime -> Timestamp,
        user_id -> Text,
        store_id -> Text,
        site_id -> Text,
    }
}

// joinable!(feedback_form -> user (user_id));

// allow_tables_to_appear_in_same_query!(feedback_form, name_link);

#[derive(
    Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset, Eq, Serialize, Deserialize, Default,
)]
#[diesel(table_name = feedback_form)]
pub struct FeedbackFormRow {
    pub id: String,
    pub reply_email: String,
    pub body: String,
    pub created_datetime: NaiveDateTime,
    pub site_id: String,
    pub store_id: String,
    pub user_id: String,
}

pub struct FeedbackFormRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> FeedbackFormRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        FeedbackFormRowRepository { connection }
    }

    pub fn _upsert_one(&self, feedback_form_row: &FeedbackFormRow) -> Result<(), RepositoryError> {
        diesel::insert_into(feedback_form)
            .values(feedback_form_row)
            .on_conflict(id)
            .do_update()
            .set(feedback_form_row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(&self, feedback_form_row: &FeedbackFormRow) -> Result<i64, RepositoryError> {
        self._upsert_one(feedback_form_row)?;
        self.insert_changelog(feedback_form_row.to_owned(), RowActionType::Upsert)
    }

    fn insert_changelog(
        &self,
        row: FeedbackFormRow,
        action: RowActionType,
    ) -> Result<i64, RepositoryError> {
        let row = ChangeLogInsertRow {
            table_name: ChangelogTableName::FeedbackForm,
            record_id: row.id,
            row_action: action,
            store_id: Some(row.store_id),
            name_link_id: None,
        };

        ChangelogRepository::new(self.connection).insert(&row)
    }

    pub fn find_one_by_id(
        &self,
        feedback_form_id: &str,
    ) -> Result<Option<FeedbackFormRow>, RepositoryError> {
        let result = feedback_form
            .filter(id.eq(feedback_form_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }
}

impl Upsert for FeedbackFormRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        let cursor_id = FeedbackFormRowRepository::new(con).upsert_one(self)?;
        Ok(Some(cursor_id))
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            FeedbackFormRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
