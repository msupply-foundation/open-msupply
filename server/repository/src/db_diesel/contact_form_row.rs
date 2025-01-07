use crate::{
    ChangeLogInsertRow, ChangelogRepository, ChangelogTableName, RepositoryError, RowActionType,
    StorageConnection, Upsert,
};

use super::{
    contact_form_row::contact_form::dsl::*, name_link_row::name_link, name_row::name,
    store_row::store, user_row::user_account,
};

use chrono::NaiveDateTime;
use diesel_derive_enum::DbEnum;
use serde::{Deserialize, Serialize};

use diesel::prelude::*;

table! {
    contact_form (id) {
        id -> Text,
        reply_email -> Text,
        body -> Text,
        created_datetime -> Timestamp,
        user_id -> Text,
        store_id -> Text,
        contact_type -> crate::db_diesel::contact_form_row::ContactTypeMapping,
    }
}

joinable!(contact_form -> store (store_id));
joinable!(contact_form -> user_account (user_id));

allow_tables_to_appear_in_same_query!(contact_form, store);
allow_tables_to_appear_in_same_query!(contact_form, user_account);
allow_tables_to_appear_in_same_query!(contact_form, name);
allow_tables_to_appear_in_same_query!(contact_form, name_link);

#[derive(
    Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset, Eq, Serialize, Deserialize, Default,
)]
#[diesel(table_name = contact_form)]
pub struct ContactFormRow {
    pub id: String,
    pub reply_email: String,
    pub body: String,
    pub created_datetime: NaiveDateTime,
    pub user_id: String,
    pub store_id: String,
    pub contact_type: ContactType,
}

#[derive(Clone, Debug, PartialEq, Default, DbEnum, Eq, Deserialize, Serialize)]
#[PgType = "contact_type_enum"]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum ContactType {
    #[default]
    Feedback,
    Support,
}

pub struct ContactFormRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ContactFormRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ContactFormRowRepository { connection }
    }

    pub fn _upsert_one(&self, contact_form_row: &ContactFormRow) -> Result<(), RepositoryError> {
        diesel::insert_into(contact_form)
            .values(contact_form_row)
            .on_conflict(id)
            .do_update()
            .set(contact_form_row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(&self, contact_form_row: &ContactFormRow) -> Result<i64, RepositoryError> {
        self._upsert_one(contact_form_row)?;
        self.insert_changelog(contact_form_row.to_owned(), RowActionType::Upsert)
    }

    fn insert_changelog(
        &self,
        row: ContactFormRow,
        action: RowActionType,
    ) -> Result<i64, RepositoryError> {
        let row = ChangeLogInsertRow {
            table_name: ChangelogTableName::ContactForm,
            record_id: row.id,
            row_action: action,
            store_id: Some(row.store_id),
            name_link_id: None,
        };

        ChangelogRepository::new(self.connection).insert(&row)
    }

    pub fn find_one_by_id(
        &self,
        contact_form_id: &str,
    ) -> Result<Option<ContactFormRow>, RepositoryError> {
        let result = contact_form
            .filter(id.eq(contact_form_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }
}

impl Upsert for ContactFormRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        let cursor_id = ContactFormRowRepository::new(con).upsert_one(self)?;
        Ok(Some(cursor_id))
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            ContactFormRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
