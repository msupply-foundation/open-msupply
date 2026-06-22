use crate::{
    diesel_macros::define_batch_table, ChangelogRepository, RepositoryError, RowActionType,
    SourceSiteId, StorageConnection,
};

use super::{
    contact_form_row::contact_form::dsl::*, name_row::name, store_row::store,
    user_row::user_account,
};

use chrono::NaiveDateTime;
use diesel_derive_enum::DbEnum;
use serde::{Deserialize, Serialize};

use diesel::prelude::*;

define_batch_table! {
    struct: ContactFormRow,
    repo: ContactFormRowRepository,
    table: contact_form (id) {
        id -> Text,
        reply_email -> Text,
        body -> Text,
        created_datetime -> Timestamp,
        user_id -> Text,
        username -> Text,
        store_id -> Text,
        contact_type -> crate::db_diesel::contact_form_row::ContactTypeMapping,
    }
}

joinable!(contact_form -> store (store_id));
joinable!(contact_form -> user_account (user_id));

allow_tables_to_appear_in_same_query!(contact_form, store);
allow_tables_to_appear_in_same_query!(contact_form, user_account);
allow_tables_to_appear_in_same_query!(contact_form, name);

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
    pub username: String,
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

    pub fn upsert_one(&self, contact_form_row: &ContactFormRow) -> Result<(), RepositoryError> {
        self._upsert_one(contact_form_row)?;
        let changelog = contact_form_row.generate_changelog(
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
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

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<ContactFormRow>, RepositoryError> {
        Ok(contact_form::table
            .filter(contact_form::id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }
}
